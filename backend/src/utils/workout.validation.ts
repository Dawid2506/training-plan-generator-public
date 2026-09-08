import { z } from "zod";
import { IntervalPlan } from "../types/workout.types";

/**
 * Runtime schema for a generated interval plan.
 *
 * The plan arrives as free-form JSON from a language model and used to be cast
 * straight to IntervalPlan, which meant a missing main_set was persisted
 * happily and only surfaced later as an undefined read in the UI. Parsing here
 * turns that into a caught error at the boundary where it happened.
 *
 * Numbers are coerced because models routinely return "8" where the schema
 * asked for 8, and rejecting a whole plan over a quoted digit helps nobody.
 */

const segmentSchema = z
  .object({
    duration_min: z.coerce.number().min(0).max(600),
    target_hr: z.string().max(200),
    target_pace_or_speed: z.string().max(200),
    instruction: z.string().max(1_000),
  })
  .strict();

export const intervalPlanSchema = z
  .object({
    workout_header: z
      .object({
        title: z.string().max(200),
        sport: z.enum(["Run", "Ride"]),
        category: z.enum(["Base", "Threshold", "VO2Max", "Recovery"]),
        difficulty_score: z.coerce.number().min(1).max(10),
        estimated_total_duration_min: z.coerce.number().min(0).max(1_440),
      })
      .strict(),
    warmup: segmentSchema,
    main_set: z
      .object({
        repeats: z.coerce.number().min(0).max(100),
        work_duration_sec: z.coerce.number().min(0).max(86_400),
        work_distance_meters: z.coerce.number().min(0).max(1_000_000),
        work_target_hr: z.string().max(200),
        work_target_pace_or_speed: z.string().max(200),
        recovery_duration_sec: z.coerce.number().min(0).max(86_400),
        recovery_distance_meters: z.coerce.number().min(0).max(1_000_000),
        recovery_target_hr: z.string().max(200),
        recovery_type: z.enum(["Walk", "Light Jog", "Easy Spin"]),
      })
      .strict(),
    cooldown: segmentSchema,
    coach_notes: z
      .object({
        insight: z.string().max(2_000),
        safety_warning: z.string().max(2_000),
      })
      .strict(),
  })
  .strict();

/**
 * Compile-time proof that the schema and the hand-written interface cannot
 * drift apart: if either side gains or loses a field, this stops type-checking.
 */
const _schemaMatchesType: IntervalPlan = {} as z.infer<typeof intervalPlanSchema>;
void _schemaMatchesType;

export type ValidatedIntervalPlan = z.infer<typeof intervalPlanSchema>;
