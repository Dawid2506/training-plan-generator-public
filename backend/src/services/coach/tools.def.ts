import type OpenAI from "openai";
import { z } from "zod";

/**
 * Tool surface exposed to the model.
 *
 * Two invariants, both enforced rather than documented:
 *
 * 1. Every tool is read-only. There is no create, update or delete anywhere
 *    behind this surface, so a successful prompt injection cannot change state.
 * 2. No tool takes a user, owner or account identifier. Identity comes from the
 *    JWT and is closed over server-side, which means there is no vocabulary in
 *    which the model could ask for someone else's data. The assertion at the
 *    bottom of this file stops the process from booting if that ever changes.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => {
    const time = Date.parse(value);
    if (Number.isNaN(time)) {
      return false;
    }
    const year2000 = Date.UTC(2000, 0, 1);
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    return time >= year2000 && time <= tomorrow;
  }, "Date out of range");

const sport = z.enum(["Run", "Ride", "Other", "all"]);

/**
 * Argument schemas. `.strict()` throughout: a model that hallucinates a
 * `userId` field gets a validation error rather than a silently ignored key.
 */
export const TOOL_ARG_SCHEMAS = {
  list_activities: z
    .object({
      from: isoDate.optional(),
      to: isoDate.optional(),
      sport: sport.optional(),
      limit: z.number().int().min(1).max(50).optional(),
    })
    .strict(),

  get_activity_detail: z
    .object({ activityId: z.string().uuid() })
    .strict(),

  get_training_summary: z
    .object({
      from: isoDate.optional(),
      to: isoDate.optional(),
      groupBy: z.enum(["week", "month"]),
      sport: sport.optional(),
    })
    .strict(),

  get_hr_zone_distribution: z
    .object({
      from: isoDate.optional(),
      to: isoDate.optional(),
      sport: sport.optional(),
      maxActivities: z.number().int().min(1).max(20).optional(),
    })
    .strict(),

  get_athlete_profile: z.object({}).strict(),

  get_personal_bests: z
    .object({ sport: z.enum(["Run", "Ride"]) })
    .strict(),

  list_training_plans: z
    .object({ limit: z.number().int().min(1).max(20).optional() })
    .strict(),

  get_training_plan: z
    .object({ planId: z.string().uuid() })
    .strict(),
} as const;

export type ToolName = keyof typeof TOOL_ARG_SCHEMAS;

// Typed as the function-tool member of the union rather than the union itself,
// so the boot-time assertions below can read `.function` without narrowing.
export const TOOL_DEFS: OpenAI.Chat.Completions.ChatCompletionFunctionTool[] = [
  {
    type: "function",
    function: {
      name: "list_activities",
      description:
        "List the athlete's activities in a date range, newest first. Returns compact summaries, not streams. Use this to answer questions about what was done and when.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Inclusive start date, YYYY-MM-DD." },
          to: { type: "string", description: "Inclusive end date, YYYY-MM-DD." },
          sport: {
            type: "string",
            enum: ["Run", "Ride", "Other", "all"],
            description: "Filter by sport. Defaults to all.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 50,
            description: "Maximum activities to return. Defaults to 20.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_detail",
      description:
        "Full detail for one activity: per-kilometre splits plus the session shape compressed into time buckets. Use activityId values returned by other tools or the briefing.",
      parameters: {
        type: "object",
        properties: {
          activityId: { type: "string", description: "The activityId from a listing." },
        },
        required: ["activityId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_training_summary",
      description:
        "Totals bucketed by week or month over a date range, split by sport, with a trend against the preceding period. Use this for volume, consistency and progression questions.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Inclusive start date, YYYY-MM-DD." },
          to: { type: "string", description: "Inclusive end date, YYYY-MM-DD." },
          groupBy: { type: "string", enum: ["week", "month"] },
          sport: { type: "string", enum: ["Run", "Ride", "Other", "all"] },
        },
        required: ["groupBy"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_hr_zone_distribution",
      description:
        "Time spent in each heart-rate zone across recent activities. Expensive - it reads full heart-rate streams - so keep the range and maxActivities tight. Requires a usable max HR.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Inclusive start date, YYYY-MM-DD." },
          to: { type: "string", description: "Inclusive end date, YYYY-MM-DD." },
          sport: { type: "string", enum: ["Run", "Ride", "Other", "all"] },
          maxActivities: {
            type: "integer",
            minimum: 1,
            maximum: 20,
            description: "How many activities to analyse. Defaults to 10.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_athlete_profile",
      description:
        "The athlete's stored profile and derived training zones, plus which fields are still missing.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_personal_bests",
      description:
        "Longest distance, longest duration, biggest climb and fastest average speed over 5 km for one sport.",
      parameters: {
        type: "object",
        properties: { sport: { type: "string", enum: ["Run", "Ride"] } },
        required: ["sport"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_training_plans",
      description: "Previously generated interval plans, newest first.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 20 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_training_plan",
      description: "The full contents of one saved interval plan.",
      parameters: {
        type: "object",
        properties: { planId: { type: "string" } },
        required: ["planId"],
        additionalProperties: false,
      },
    },
  },
];

/**
 * Boot-time invariant.
 *
 * If someone later adds an identity parameter to a tool - the one change that
 * would turn this whole design from "cross-account reads are impossible" into
 * "cross-account reads depend on the model behaving" - the process refuses to
 * start rather than shipping the hole.
 */
const IDENTITY_PARAM = /user|owner|account|athlete_?id|tenant|email/i;

for (const tool of TOOL_DEFS) {
  const properties = (tool.function.parameters?.properties ?? {}) as Record<string, unknown>;
  const offending = Object.keys(properties).find((key) => IDENTITY_PARAM.test(key));
  if (offending) {
    throw new Error(
      `Coach tool "${tool.function.name}" exposes an identity parameter "${offending}". ` +
        "Identity must come from the JWT, never from the model."
    );
  }
}

// The wire schemas and the validation schemas must describe the same tools, or
// the model could send a parameter that nothing validates.
const defNames = TOOL_DEFS.map((tool) => tool.function.name).sort();
const schemaNames = Object.keys(TOOL_ARG_SCHEMAS).sort();
if (defNames.join(",") !== schemaNames.join(",")) {
  throw new Error(
    `Coach tool definitions and argument schemas disagree: [${defNames}] vs [${schemaNames}]`
  );
}
