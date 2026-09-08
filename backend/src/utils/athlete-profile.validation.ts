import { z } from "zod";

/**
 * Athlete profile input.
 *
 * Every field is optional so the form can be filled in over time, but the
 * physiological ones carry real bounds: a max HR of 400 is a typo, and silently
 * accepting it would poison every zone the coach computes from it.
 *
 * The two free-text fields are the profile's contribution to the prompt-injection
 * surface. They are length-capped here and sanitized again on the way into a
 * prompt - this cap is about storage, that one is about the trust boundary.
 */

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .nullable()
  .optional();

export const athleteProfileSchema = z
  .object({
    birthDate: optionalDate,
    sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
    weightKg: z.number().min(30).max(250).nullable().optional(),
    heightCm: z.number().min(100).max(250).nullable().optional(),
    restingHr: z.number().int().min(25).max(100).nullable().optional(),
    maxHr: z.number().int().min(100).max(230).nullable().optional(),
    ftpWatts: z.number().int().min(50).max(600).nullable().optional(),
    // 2:00/km is world-record territory, 15:00/km is walking.
    thresholdPaceSecPerKm: z.number().int().min(120).max(900).nullable().optional(),
    experienceLevel: z
      .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"])
      .nullable()
      .optional(),
    primaryGoal: z.string().max(200).nullable().optional(),
    targetEventName: z.string().max(80).nullable().optional(),
    targetEventDate: optionalDate,
    weeklyHours: z.number().min(0).max(40).nullable().optional(),
    weeklySessions: z.number().int().min(0).max(21).nullable().optional(),
    units: z.enum(["METRIC", "IMPERIAL"]).optional(),
  })
  // Reject unknown keys outright: a body carrying userId or role must not be
  // quietly ignored, it must be a visible 400.
  .strict();

export type AthleteProfileInput = z.infer<typeof athleteProfileSchema>;
