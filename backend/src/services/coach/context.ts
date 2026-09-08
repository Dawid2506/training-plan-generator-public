import * as athleteProfileService from "../athlete-profile.service";
import {
  ActivityIndexRow,
  auditIndexSignals,
  loadActivityIndex,
} from "./activity-index.repo";
import * as repository from "./repository";
import {
  acuteChronicRatio,
  consistency,
  periodTotals,
  sessionLine,
  trendDelta,
  weeklyRollup,
} from "./aggregate";
import { computeHrZones, computePaceZones, computePowerZones, HrZoneModel } from "./zones";
import { FIELD, sanitizeUntrusted } from "./sanitize";
import * as audit from "./audit";

/**
 * The briefing: what the coach knows before it asks for anything.
 *
 * Sized to stay under roughly 2500 tokens. The principle is that the briefing
 * answers "how is this athlete training in general" while anything deeper - one
 * session's splits, a range outside the recent weeks, time in zones - costs a
 * tool call. That keeps the common question cheap and the rare question
 * possible, instead of making every question expensive.
 */

const BRIEFING_WEEKS = 8;
const RECENT_SESSIONS = 10;

export interface CoachContext {
  userId: string;
  sessionId?: string;
  messageId?: string;
  index: ActivityIndexRow[];
  zoneModel: HrZoneModel | null;
  units: string;
}

export interface Briefing {
  context: CoachContext;
  /** Serialised JSON, ready to be fenced into a prompt. */
  json: string;
}

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const buildContext = async (params: {
  userId: string;
  sessionId?: string;
  messageId?: string;
}): Promise<CoachContext> => {
  const [profile, index] = await Promise.all([
    athleteProfileService.getProfile(params.userId),
    loadActivityIndex(params.userId),
  ]);

  // Flag any poisoned activity name once per turn, with the row id, so it can
  // actually be found and fixed rather than just noted.
  auditIndexSignals(index, params);

  const observed = profile?.maxHr
    ? null
    : await repository.observedMaxHr(params.userId);

  const zoneModel = computeHrZones({
    profileMaxHr: profile?.maxHr ?? null,
    observedMaxHr: observed,
    birthDate: profile?.birthDate ?? null,
    restingHr: profile?.restingHr ?? null,
  });

  return {
    userId: params.userId,
    sessionId: params.sessionId,
    messageId: params.messageId,
    index,
    zoneModel,
    units: profile?.units ?? "METRIC",
  };
};

export const buildBriefing = async (context: CoachContext): Promise<string> => {
  const profile = await athleteProfileService.getProfile(context.userId);
  const { index, zoneModel } = context;

  const goal = sanitizeUntrusted(profile?.primaryGoal, FIELD.profileGoal);
  const event = sanitizeUntrusted(profile?.targetEventName, FIELD.eventName);

  for (const [field, result] of [
    ["primaryGoal", goal],
    ["targetEventName", event],
  ] as const) {
    if (result.suspicious) {
      audit.injectionSignal({
        userId: context.userId,
        sessionId: context.sessionId,
        messageId: context.messageId,
        source: "profile_goal",
        signals: [field, ...result.signals],
        text: result.text,
      });
    }
  }

  const dates = index.map((row) => row.startDate.getTime()).filter((time) => time > 0);
  const lastActivity = dates.length > 0 ? new Date(Math.max(...dates)) : null;
  const firstActivity = dates.length > 0 ? new Date(Math.min(...dates)) : null;

  const briefing = {
    today: isoDate(new Date()),
    units: context.units,

    athlete: profile
      ? {
          age: profile.birthDate
            ? Math.floor(
                (Date.now() - profile.birthDate.getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000)
              )
            : null,
          sex: profile.sex,
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          restingHr: profile.restingHr,
          maxHr: profile.maxHr,
          ftpWatts: profile.ftpWatts,
          thresholdPaceSecPerKm: profile.thresholdPaceSecPerKm,
          experienceLevel: profile.experienceLevel,
          weeklyHoursAvailable: profile.weeklyHours,
          weeklySessionsAvailable: profile.weeklySessions,
          primaryGoal_untrusted: goal.text || null,
          targetEvent_untrusted: event.text || null,
          targetEventDate: profile.targetEventDate
            ? isoDate(profile.targetEventDate)
            : null,
        }
      : null,
    missingProfileFields: athleteProfileService.missingProfileFields(profile),

    hrZones: zoneModel
      ? {
          method: zoneModel.method,
          hrMaxUsed: zoneModel.hrMaxUsed,
          hrMaxSource: zoneModel.hrMaxSource,
          restingHrUsed: zoneModel.restingHrUsed,
          zones: zoneModel.zones,
        }
      : null,
    hrZonesUnavailableReason: zoneModel
      ? null
      : "No max HR on the profile, no usable observed max in the last year, and no birth date to estimate from.",
    paceZones: computePaceZones(profile?.thresholdPaceSecPerKm ?? null),
    powerZones: computePowerZones(profile?.ftpWatts ?? null),

    corpus: {
      totalActivities: index.length,
      firstActivityDate: firstActivity ? isoDate(firstActivity) : null,
      lastActivityDate: lastActivity ? isoDate(lastActivity) : null,
      daysSinceLastActivity: lastActivity
        ? Math.floor((Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))
        : null,
      allTime: periodTotals(index, zoneModel),
    },

    last8Weeks: weeklyRollup(index, BRIEFING_WEEKS, zoneModel),
    trend4w: trendDelta(index, 28, zoneModel),
    acuteChronicRatio: acuteChronicRatio(index, zoneModel),
    consistency12w: consistency(index, 12),

    recentSessions: index.slice(0, RECENT_SESSIONS).map(sessionLine),

    loadScoreNote:
      "loadScore is a crude duration x intensity proxy derived from average heart rate. It is NOT TSS and carries no unit. Do not present it as a training-stress score.",

    notInThisBriefing: {
      description:
        "Anything not listed above requires a tool call. Do not estimate it.",
      available: {
        list_activities: "activities in any date range, filtered by sport",
        get_activity_detail: "one session's per-kilometre splits and stream shape",
        get_training_summary: "totals bucketed by week or month over any range",
        get_hr_zone_distribution: "time spent in each heart-rate zone",
        get_personal_bests: "longest, fastest and biggest-climb sessions",
        list_training_plans: "previously generated interval plans",
        get_training_plan: "the full contents of one saved plan",
      },
    },
  };

  return JSON.stringify(briefing);
};
