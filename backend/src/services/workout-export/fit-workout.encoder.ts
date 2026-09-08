import { IntervalPlan } from "../../types/workout.types";
import {
  NumericRange,
  parseHeartRateRange,
  parsePaceOrSpeedRange,
} from "./target-parser";

/**
 * Encodes an IntervalPlan as a FIT workout file, the format Garmin watches read
 * from GARMIN/NewFiles over USB. This is the free route onto the watch: Garmin
 * Connect only imports completed activities, and pushing a plan into the
 * Connect calendar needs the approval-gated Training API.
 *
 * @garmin/fitsdk is ESM-only and the backend compiles to CommonJS, so the SDK
 * is pulled in through a runtime dynamic import. Going through `new Function`
 * keeps TypeScript from rewriting the import() into a require(), which the
 * Node 18 runtime in the Docker image cannot use on an ESM package.
 */
const importEsmModule = new Function(
  "specifier",
  "return import(specifier);"
) as (specifier: string) => Promise<any>;

let fitSdkPromise: Promise<any> | undefined;

const loadFitSdk = (): Promise<any> => {
  if (!fitSdkPromise) {
    fitSdkPromise = importEsmModule("@garmin/fitsdk");
  }
  return fitSdkPromise;
};

/** FIT stores step durations in milliseconds and distances in centimetres. */
const MS_PER_SECOND = 1000;
const CM_PER_METER = 100;
/** Custom heart rate targets are stored as bpm + 100; 1-100 mean % of max HR. */
const HEART_RATE_OFFSET = 100;
/** Custom speed targets are stored as m/s * 1000. */
const SPEED_SCALE = 1000;

/** Watches show workout names in full lists but truncate step names on screen. */
const MAX_WORKOUT_NAME_LENGTH = 40;
const MAX_STEP_NAME_LENGTH = 15;
const MAX_NOTES_LENGTH = 100;

type StepDuration =
  | { kind: "time"; seconds: number }
  | { kind: "distance"; meters: number };

interface StepTarget {
  targetType: string;
  customTargetValueLow: number;
  customTargetValueHigh: number;
}

interface StepInput {
  name: string;
  intensity: string;
  duration: StepDuration;
  heartRateText?: string;
  paceOrSpeedText?: string;
  notes?: string;
}

const truncate = (value: string, maxLength: number): string =>
  value.trim().slice(0, maxLength);

const OPEN_TARGET: StepTarget = {
  targetType: "open",
  customTargetValueLow: 0,
  customTargetValueHigh: 0,
};

const speedTarget = (range: NumericRange): StepTarget => ({
  targetType: "speed",
  customTargetValueLow: Math.round(range.low * SPEED_SCALE),
  customTargetValueHigh: Math.round(range.high * SPEED_SCALE),
});

const heartRateTarget = (range: NumericRange): StepTarget => ({
  targetType: "heartRate",
  customTargetValueLow: Math.round(range.low) + HEART_RATE_OFFSET,
  customTargetValueHigh: Math.round(range.high) + HEART_RATE_OFFSET,
});

/**
 * Which metric the watch should hold the athlete to depends on the sport.
 * On a bike, speed says more about the gradient and the wind than about the
 * effort, so heart rate leads and speed is only the fallback. Running is the
 * other way round: pace is the instruction, heart rate the backup.
 */
const resolveTarget = (
  step: StepInput,
  sport: IntervalPlan["workout_header"]["sport"]
): StepTarget => {
  const paceRange = parsePaceOrSpeedRange(step.paceOrSpeedText);
  const heartRateRange = parseHeartRateRange(step.heartRateText);

  if (sport === "Ride") {
    if (heartRateRange) return heartRateTarget(heartRateRange);
    if (paceRange) return speedTarget(paceRange);
    return OPEN_TARGET;
  }

  if (paceRange) return speedTarget(paceRange);
  if (heartRateRange) return heartRateTarget(heartRateRange);

  return OPEN_TARGET;
};

const buildSteps = (plan: IntervalPlan): StepInput[] => {
  const steps: StepInput[] = [];
  const { warmup, main_set: mainSet, cooldown } = plan;

  if (warmup.duration_min > 0) {
    steps.push({
      name: "Warm-up",
      intensity: "warmup",
      duration: { kind: "time", seconds: warmup.duration_min * 60 },
      heartRateText: warmup.target_hr,
      paceOrSpeedText: warmup.target_pace_or_speed,
      notes: warmup.instruction,
    });
  }

  if (mainSet.work_duration_sec > 0 || mainSet.work_distance_meters > 0) {
    steps.push({
      name: "Work",
      intensity: "active",
      duration:
        mainSet.work_duration_sec > 0
          ? { kind: "time", seconds: mainSet.work_duration_sec }
          : { kind: "distance", meters: mainSet.work_distance_meters },
      heartRateText: mainSet.work_target_hr,
      paceOrSpeedText: mainSet.work_target_pace_or_speed,
    });
  }

  if (mainSet.recovery_duration_sec > 0 || mainSet.recovery_distance_meters > 0) {
    steps.push({
      name: truncate(mainSet.recovery_type, MAX_STEP_NAME_LENGTH),
      intensity: "rest",
      duration:
        mainSet.recovery_duration_sec > 0
          ? { kind: "time", seconds: mainSet.recovery_duration_sec }
          : { kind: "distance", meters: mainSet.recovery_distance_meters },
      heartRateText: mainSet.recovery_target_hr,
    });
  }

  if (cooldown.duration_min > 0) {
    steps.push({
      name: "Cool-down",
      intensity: "cooldown",
      duration: { kind: "time", seconds: cooldown.duration_min * 60 },
      heartRateText: cooldown.target_hr,
      paceOrSpeedText: cooldown.target_pace_or_speed,
      notes: cooldown.instruction,
    });
  }

  return steps;
};

export class EmptyWorkoutError extends Error {
  constructor() {
    super("The plan has no step with a duration or distance to export.");
    this.name = "EmptyWorkoutError";
  }
}

/**
 * Builds the FIT message list: file_id, workout, then the workout steps with
 * a repeat step wrapped around the work/recovery pair.
 */
export const encodeIntervalPlanToFit = async (
  plan: IntervalPlan
): Promise<Buffer> => {
  const { Encoder, Profile } = await loadFitSdk();

  const stepInputs = buildSteps(plan);
  if (stepInputs.length === 0) {
    throw new EmptyWorkoutError();
  }

  const encoder = new Encoder();

  encoder.onMesg(Profile.MesgNum.FILE_ID, {
    type: "workout",
    manufacturer: "development",
    product: 0,
    serialNumber: 0,
    timeCreated: new Date(),
  });

  const messages: Record<string, unknown>[] = [];
  const repeats = Math.floor(plan.main_set.repeats);
  const isMainSetStep = (step: StepInput) =>
    step.intensity === "active" || step.intensity === "rest";
  const workStepIndex = stepInputs.findIndex((step) => step.intensity === "active");
  const lastMainSetIndex = stepInputs.reduce(
    (last, step, index) => (isMainSetStep(step) ? index : last),
    -1
  );

  stepInputs.forEach((step, index) => {
    const target = resolveTarget(step, plan.workout_header.sport);

    const message: Record<string, unknown> = {
      messageIndex: messages.length,
      wktStepName: truncate(step.name, MAX_STEP_NAME_LENGTH),
      intensity: step.intensity,
      durationType: step.duration.kind === "time" ? "time" : "distance",
      durationValue:
        step.duration.kind === "time"
          ? Math.round(step.duration.seconds * MS_PER_SECOND)
          : Math.round(step.duration.meters * CM_PER_METER),
      targetType: target.targetType,
      targetValue: 0,
      customTargetValueLow: target.customTargetValueLow,
      customTargetValueHigh: target.customTargetValueHigh,
    };

    if (step.notes) {
      message.notes = truncate(step.notes, MAX_NOTES_LENGTH);
    }

    messages.push(message);

    // The repeat step closes the loop after the recovery and points back at
    // the work step, so it only makes sense with a work step and >1 round.
    if (index === lastMainSetIndex && repeats > 1 && workStepIndex >= 0) {
      messages.push({
        messageIndex: messages.length,
        durationType: "repeatUntilStepsCmplt",
        durationValue: workStepIndex,
        targetValue: repeats,
      });
    }
  });

  encoder.onMesg(Profile.MesgNum.WORKOUT, {
    wktName: truncate(plan.workout_header.title, MAX_WORKOUT_NAME_LENGTH),
    sport: plan.workout_header.sport === "Ride" ? "cycling" : "running",
    subSport: "generic",
    capabilities: 32, // WORKOUT_CAPABILITIES_TCX, what other exporters write
    numValidSteps: messages.length,
  });

  messages.forEach((message) => {
    encoder.onMesg(Profile.MesgNum.WORKOUT_STEP, message);
  });

  return Buffer.from(encoder.close());
};
