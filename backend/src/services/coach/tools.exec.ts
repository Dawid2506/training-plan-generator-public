import * as athleteProfileService from "../athlete-profile.service";
import { CoachContext } from "./context";
import { ActivityIndexRow, loadActivityIndex } from "./activity-index.repo";
import * as repository from "./repository";
import {
  periodTotals,
  personalBests,
  sessionLine,
  trendDelta,
  weeklyRollup,
} from "./aggregate";
import { computePaceZones, computePowerZones } from "./zones";
import { TOOL_ARG_SCHEMAS, ToolName } from "./tools.def";

/**
 * Tool execution.
 *
 * A closed switch over a known set of names. Nothing here writes, and every
 * read is scoped by `context.userId`, which came from the JWT and is not
 * reachable from the model's arguments.
 *
 * Errors never escape: a failing tool returns a small, described failure that
 * goes back to the model as data, so a bad argument becomes a retry rather than
 * a 500. Error text is deliberately generic - a Prisma message would leak the
 * schema straight into a prompt.
 */

export interface ToolFailure {
  ok: false;
  error:
    | "unknown_tool"
    | "invalid_arguments"
    | "not_found"
    | "no_data"
    | "unavailable"
    | "internal";
  message: string;
}

export interface ToolSuccess {
  ok: true;
  data: unknown;
}

export type ToolResult = ToolSuccess | ToolFailure;

const fail = (error: ToolFailure["error"], message: string): ToolFailure => ({
  ok: false,
  error,
  message,
});

const parseDate = (value: string | undefined, fallback: Date | null): Date | null =>
  value ? new Date(`${value}T00:00:00.000Z`) : fallback;

const filterSport = (
  rows: ActivityIndexRow[],
  sport: string | undefined
): ActivityIndexRow[] =>
  !sport || sport === "all" ? rows : rows.filter((row) => row.sport === sport);

const inRange = (
  rows: ActivityIndexRow[],
  from: Date | null,
  to: Date | null
): ActivityIndexRow[] =>
  rows.filter((row) => {
    if (from && row.startDate < from) return false;
    if (to && row.startDate > to) return false;
    return true;
  });

/** Month buckets, for the groupBy: "month" case. */
const monthlyRollup = (rows: ActivityIndexRow[], zoneModel: CoachContext["zoneModel"]) => {
  const buckets = new Map<string, ActivityIndexRow[]>();

  for (const row of rows) {
    const key = row.startDate.toISOString().slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      buckets.set(key, [row]);
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, monthRows]) => ({
      month,
      totals: periodTotals(monthRows, zoneModel),
    }));
};

const execute = async (
  name: ToolName,
  args: Record<string, unknown>,
  context: CoachContext
): Promise<ToolResult> => {
  switch (name) {
    case "list_activities": {
      const { from, to, sport, limit } = args as {
        from?: string;
        to?: string;
        sport?: string;
        limit?: number;
      };

      const matching = filterSport(
        inRange(context.index, parseDate(from, null), parseDate(to, null)),
        sport
      );
      const take = limit ?? 20;

      return {
        ok: true,
        data: {
          activities: matching.slice(0, take).map(sessionLine),
          totalMatching: matching.length,
          truncated: matching.length > take,
        },
      };
    }

    case "get_activity_detail": {
      const { activityId } = args as { activityId: string };
      const detail = await repository.getActivityDetail(context.userId, activityId);
      return detail
        ? { ok: true, data: detail }
        : fail("not_found", "No activity with that id belongs to this athlete.");
    }

    case "get_training_summary": {
      const { from, to, groupBy, sport } = args as {
        from?: string;
        to?: string;
        groupBy: "week" | "month";
        sport?: string;
      };

      const rows = filterSport(
        inRange(context.index, parseDate(from, null), parseDate(to, null)),
        sport
      );

      if (rows.length === 0) {
        return fail("no_data", "No activities in that range.");
      }

      return {
        ok: true,
        data: {
          groupBy,
          buckets:
            groupBy === "month"
              ? monthlyRollup(rows, context.zoneModel)
              : weeklyRollup(rows, 12, context.zoneModel),
          totals: periodTotals(rows, context.zoneModel),
          trend: trendDelta(rows, 28, context.zoneModel),
        },
      };
    }

    case "get_hr_zone_distribution": {
      if (!context.zoneModel) {
        return fail(
          "unavailable",
          "No heart-rate zone model: the athlete has no max HR on their profile, no usable observed max, and no birth date to estimate from."
        );
      }

      const { from, to, sport, maxActivities } = args as {
        from?: string;
        to?: string;
        sport?: string;
        maxActivities?: number;
      };

      const candidates = filterSport(
        inRange(context.index, parseDate(from, null), parseDate(to, null)),
        sport
      ).slice(0, maxActivities ?? 10);

      if (candidates.length === 0) {
        return fail("no_data", "No activities in that range.");
      }

      const distribution = await repository.getZoneDistribution(
        context.userId,
        candidates.map((row) => row.id),
        context.zoneModel
      );

      return { ok: true, data: distribution };
    }

    case "get_athlete_profile": {
      const profile = await athleteProfileService.getProfile(context.userId);
      return {
        ok: true,
        data: {
          profile,
          missingFields: athleteProfileService.missingProfileFields(profile),
          hrZones: context.zoneModel,
          paceZones: computePaceZones(profile?.thresholdPaceSecPerKm ?? null),
          powerZones: computePowerZones(profile?.ftpWatts ?? null),
        },
      };
    }

    case "get_personal_bests": {
      const { sport } = args as { sport: "Run" | "Ride" };
      const rows = filterSport(context.index, sport);
      return rows.length > 0
        ? { ok: true, data: { sport, bests: personalBests(rows) } }
        : fail("no_data", `No ${sport} activities recorded.`);
    }

    case "list_training_plans": {
      const { limit } = args as { limit?: number };
      return { ok: true, data: await repository.listPlans(context.userId, limit ?? 10) };
    }

    case "get_training_plan": {
      const { planId } = args as { planId: string };
      const plan = await repository.getPlan(context.userId, planId);
      return plan
        ? { ok: true, data: plan }
        : fail("not_found", "No plan with that id belongs to this athlete.");
    }

    default: {
      // Exhaustiveness: adding a tool name without a case stops compilation.
      const exhaustive: never = name;
      return fail("unknown_tool", `Unknown tool ${String(exhaustive)}.`);
    }
  }
};

/**
 * Validate then dispatch. Never throws.
 */
export const dispatchTool = async (
  name: string,
  rawArguments: string,
  context: CoachContext
): Promise<ToolResult> => {
  const schema = TOOL_ARG_SCHEMAS[name as ToolName];
  if (!schema) {
    return fail("unknown_tool", `There is no tool called ${name}.`);
  }

  let parsedJson: unknown;
  try {
    // Models do emit malformed JSON here, and an empty argument string is a
    // normal way of calling a no-parameter tool.
    parsedJson = rawArguments.trim() ? JSON.parse(rawArguments) : {};
  } catch {
    return fail("invalid_arguments", "Arguments were not valid JSON.");
  }

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    return fail(
      "invalid_arguments",
      parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")
        .slice(0, 300)
    );
  }

  try {
    return await execute(
      name as ToolName,
      parsed.data as Record<string, unknown>,
      context
    );
  } catch (error) {
    // Log the real cause, tell the model something generic: a Prisma error
    // message would put the database schema into the prompt.
    console.error(`coach tool ${name} failed`, error);
    return fail("internal", "That lookup failed. Try a narrower request.");
  }
};

/** Some tools need the full history rather than the preloaded index window. */
export const refreshIndexForRange = async (
  context: CoachContext,
  from: Date
): Promise<ActivityIndexRow[]> => loadActivityIndex(context.userId, { from });
