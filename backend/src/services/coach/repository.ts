import { prisma } from "../../prisma/client";
import { TrainingPlanService } from "../trainingPlan.service";
import { ActivityFileService } from "../activityFile.service";
import {
  ActivityDataPoint,
  ActivitySplit,
} from "../../types/activity-analysis.types";
import { intervalPlanSchema } from "../../utils/workout.validation";
import { normalizeActivityType } from "../../utils/activity-type";
import { FIELD, sanitizeText } from "./sanitize";
import { HrZoneModel, zoneForBpm } from "./zones";

/**
 * Every database read a coach tool performs goes through this module.
 *
 * The rule the whole design rests on: each exported function takes `userId` as
 * its first parameter and puts it in the `where` clause. The model never
 * supplies it - it comes from the JWT, is fixed for the request, and is not a
 * tool parameter, so there is no phrasing that reaches another athlete's rows.
 *
 * Reads only. Nothing here creates, updates or deletes, which is why a
 * successful prompt injection cannot change state.
 */

/** Buckets used to summarise a stream. Enough shape to reason about, ~20 rows. */
const STREAM_BUCKETS = 20;

export interface StreamBucket {
  fromMin: number;
  toMin: number;
  avgHr: number | null;
  avgSpeedKmh: number | null;
  avgGrade: number | null;
  avgAltitudeM: number | null;
}

export interface ActivityDetail {
  activityId: string;
  date: string;
  sport: string;
  source: string;
  name_untrusted: string;
  fileName_untrusted: string;
  distanceKm: number;
  durationMin: number;
  elevationM: number;
  avgHr: number | null;
  maxHr: number | null;
  splits: ActivitySplit[];
  streamBuckets: StreamBucket[];
  streamNote: string;
}

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const mean = (values: number[]): number | null =>
  values.length > 0 ? round(values.reduce((a, b) => a + b, 0) / values.length) : null;

/**
 * Compress a 15-second-resolution stream into a handful of buckets.
 *
 * A five-hour ride is ~1200 data points; handed to a model verbatim that is
 * both unaffordable and unreadable. Twenty buckets keep the shape of the
 * session - where the surges were, whether HR drifted - at a fraction of the
 * cost, and the coach is told the resolution so it does not over-read them.
 */
const bucketStream = (points: ActivityDataPoint[]): StreamBucket[] => {
  if (points.length === 0) {
    return [];
  }

  const size = Math.max(1, Math.ceil(points.length / STREAM_BUCKETS));
  const buckets: StreamBucket[] = [];

  for (let start = 0; start < points.length; start += size) {
    const slice = points.slice(start, start + size);
    const numeric = (pick: (point: ActivityDataPoint) => number): number[] =>
      slice.map(pick).filter((value) => Number.isFinite(value) && value !== 0);

    buckets.push({
      fromMin: round(slice[0].time / 60),
      toMin: round(slice[slice.length - 1].time / 60),
      avgHr: mean(numeric((point) => point.heartrate)),
      avgSpeedKmh: mean(numeric((point) => point.speed)),
      avgGrade: mean(slice.map((point) => point.grade ?? 0)),
      avgAltitudeM: mean(numeric((point) => point.altitude)),
    });
  }

  return buckets;
};

interface ActivityRow {
  id: string;
  sourceType: string;
  sourceFileName: string;
  createdAt: Date;
  payload: unknown;
}

const loadOwnedActivity = async (
  userId: string,
  activityId: string
): Promise<ActivityRow | null> =>
  (prisma as any).userActivity.findFirst({
    // Ownership is part of the lookup, never a check done afterwards.
    where: { id: activityId, userId },
    select: {
      id: true,
      sourceType: true,
      sourceFileName: true,
      createdAt: true,
      payload: true,
    },
  });

export const getActivityDetail = async (
  userId: string,
  activityId: string
): Promise<ActivityDetail | null> => {
  const row = await loadOwnedActivity(userId, activityId);
  if (!row) {
    return null;
  }

  const [entry] = ActivityFileService.getAnalysisEntries(row.payload);
  if (!entry?.activity) {
    return null;
  }

  const activity = entry.activity;
  const movingTime = Number(activity.moving_time) || 0;
  const distance = Number(activity.distance) || 0;
  const startDate = activity.start_date ? new Date(activity.start_date) : row.createdAt;

  return {
    activityId: row.id,
    date: Number.isNaN(startDate.getTime())
      ? row.createdAt.toISOString().slice(0, 10)
      : startDate.toISOString().slice(0, 10),
    sport: normalizeActivityType(activity.type),
    source: row.sourceType,
    name_untrusted: sanitizeText(activity.name, FIELD.activityName),
    fileName_untrusted: sanitizeText(row.sourceFileName, FIELD.fileName),
    distanceKm: round(distance / 1000, 2),
    durationMin: Math.round(movingTime / 60),
    elevationM: Math.round(Number(activity.total_elevation_gain) || 0),
    avgHr: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    maxHr: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
    splits: (entry.streams?.splits ?? []).slice(0, 50),
    streamBuckets: bucketStream(entry.streams?.dataPoints ?? []),
    streamNote:
      "Stream compressed from 15-second samples into time buckets; treat values as averages over each bucket, not instantaneous readings.",
  };
};

export interface ZoneDistribution {
  zoneModel: {
    method: string;
    hrMaxUsed: number;
    hrMaxSource: string;
    restingHrUsed: number | null;
  };
  perZone: Array<{ zone: number; name: string; minutes: number; pct: number }>;
  activitiesAnalysed: number;
  activitiesSkippedNoHr: number;
}

/**
 * Time in heart-rate zones across a set of activities.
 *
 * This is the one genuinely expensive read - it needs the raw streams - so it
 * is never preloaded into the briefing and the number of activities is capped
 * by the caller.
 */
export const getZoneDistribution = async (
  userId: string,
  activityIds: string[],
  model: HrZoneModel
): Promise<ZoneDistribution> => {
  const rows = (await (prisma as any).userActivity.findMany({
    where: { id: { in: activityIds }, userId },
    select: { payload: true },
  })) as Array<{ payload: unknown }>;

  // Samples are 15 seconds apart, so counting samples gives us seconds.
  const secondsPerZone = new Map<number, number>();
  let analysed = 0;
  let skipped = 0;

  for (const row of rows) {
    const [entry] = ActivityFileService.getAnalysisEntries(row.payload);
    const points = entry?.streams?.dataPoints ?? [];
    const withHr = points.filter((point) => Number(point.heartrate) > 0);

    if (withHr.length === 0) {
      skipped += 1;
      continue;
    }

    analysed += 1;
    for (const point of withHr) {
      const zone = zoneForBpm(model, point.heartrate);
      if (zone > 0) {
        secondsPerZone.set(zone, (secondsPerZone.get(zone) ?? 0) + 15);
      }
    }
  }

  const totalSeconds = [...secondsPerZone.values()].reduce((a, b) => a + b, 0);

  return {
    zoneModel: {
      method: model.method,
      hrMaxUsed: model.hrMaxUsed,
      hrMaxSource: model.hrMaxSource,
      restingHrUsed: model.restingHrUsed,
    },
    perZone: model.zones.map((zone) => {
      const seconds = secondsPerZone.get(zone.zone) ?? 0;
      return {
        zone: zone.zone,
        name: zone.name,
        minutes: Math.round(seconds / 60),
        pct: totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0,
      };
    }),
    activitiesAnalysed: analysed,
    activitiesSkippedNoHr: skipped,
  };
};

export interface PlanSummary {
  planId: string;
  createdAt: string;
  title_untrusted: string;
  sport: string;
  category: string;
  estimatedDurationMin: number;
}

export interface PlanListResult {
  plans: PlanSummary[];
  skippedMalformed: number;
}

/**
 * Saved plans are second-order untrusted input: they were written by an earlier
 * model call that had itself ingested activity names, so their free text can
 * carry an injection that was planted a week ago. Validate the shape, then
 * sanitize every string leaf.
 */
export const listPlans = async (
  userId: string,
  limit: number
): Promise<PlanListResult> => {
  const { items } = await TrainingPlanService.getUserPlans({ userId, page: 1, limit });
  const plans: PlanSummary[] = [];
  let skippedMalformed = 0;

  for (const item of items) {
    const parsed = intervalPlanSchema.safeParse(item.plan);
    if (!parsed.success) {
      skippedMalformed += 1;
      continue;
    }

    plans.push({
      planId: item.id,
      createdAt: item.createdAt.toISOString().slice(0, 10),
      title_untrusted: sanitizeText(parsed.data.workout_header.title, FIELD.planText),
      sport: parsed.data.workout_header.sport,
      category: parsed.data.workout_header.category,
      estimatedDurationMin: parsed.data.workout_header.estimated_total_duration_min,
    });
  }

  return { plans, skippedMalformed };
};

export const getPlan = async (userId: string, planId: string) => {
  // Scoped lookup, not a fetch-then-compare - see TrainingPlanService.
  const record = await TrainingPlanService.getPlanByIdForUser(planId, userId);
  if (!record) {
    return null;
  }

  const parsed = intervalPlanSchema.safeParse(record.plan);
  if (!parsed.success) {
    return null;
  }

  const plan = parsed.data;
  return {
    planId: record.id,
    createdAt: record.createdAt.toISOString().slice(0, 10),
    plan: {
      ...plan,
      workout_header: {
        ...plan.workout_header,
        title: sanitizeText(plan.workout_header.title, FIELD.planText),
      },
      coach_notes: {
        insight: sanitizeText(plan.coach_notes.insight, FIELD.planText),
        safety_warning: sanitizeText(plan.coach_notes.safety_warning, FIELD.planText),
      },
    },
  };
};

/**
 * Highest max_heartrate seen in the trailing year - the fallback when the
 * athlete has not told us their HRmax.
 */
export const observedMaxHr = async (userId: string): Promise<number | null> => {
  try {
    const rows = await prisma.$queryRaw<Array<{ max_hr: number | null }>>`
      SELECT MAX(CASE WHEN jsonb_typeof(a->'max_heartrate') = 'number'
                      THEN (a->>'max_heartrate')::float END) AS max_hr
      FROM "UserActivity" ua
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(ua.payload->'analysisData') = 'array'
             THEN ua.payload->'analysisData' ELSE '[]'::jsonb END) AS entry(value)
      CROSS JOIN LATERAL (SELECT entry.value->'activity') AS act(a)
      WHERE ua."userId" = ${userId}
        AND ua."createdAt" >= NOW() - INTERVAL '365 days'
    `;
    return rows[0]?.max_hr ?? null;
  } catch (error) {
    console.error("observedMaxHr failed", error);
    return null;
  }
};
