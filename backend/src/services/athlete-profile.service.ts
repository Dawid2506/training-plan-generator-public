import { prisma } from "../prisma/client";
import { AthleteProfileInput } from "../utils/athlete-profile.validation";

/**
 * Read and write the athlete's own details.
 *
 * Always scoped by userId, which comes from the JWT - the profile is never
 * addressed by its own id from the outside, so there is no lookup that could
 * return someone else's row.
 */

export interface AthleteProfileRecord {
  birthDate: Date | null;
  sex: string | null;
  weightKg: number | null;
  heightCm: number | null;
  restingHr: number | null;
  maxHr: number | null;
  ftpWatts: number | null;
  thresholdPaceSecPerKm: number | null;
  experienceLevel: string | null;
  primaryGoal: string | null;
  targetEventName: string | null;
  targetEventDate: Date | null;
  weeklyHours: number | null;
  weeklySessions: number | null;
  units: string;
  updatedAt: Date;
}

const toDate = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getProfile = async (
  userId: string
): Promise<AthleteProfileRecord | null> =>
  (prisma as any).athleteProfile.findUnique({
    where: { userId },
    select: {
      birthDate: true,
      sex: true,
      weightKg: true,
      heightCm: true,
      restingHr: true,
      maxHr: true,
      ftpWatts: true,
      thresholdPaceSecPerKm: true,
      experienceLevel: true,
      primaryGoal: true,
      targetEventName: true,
      targetEventDate: true,
      weeklyHours: true,
      weeklySessions: true,
      units: true,
      updatedAt: true,
    },
  });

export const upsertProfile = async (
  userId: string,
  input: AthleteProfileInput
): Promise<AthleteProfileRecord> => {
  const data = {
    ...input,
    birthDate: toDate(input.birthDate),
    targetEventDate: toDate(input.targetEventDate),
  };

  return (prisma as any).athleteProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: {
      birthDate: true,
      sex: true,
      weightKg: true,
      heightCm: true,
      restingHr: true,
      maxHr: true,
      ftpWatts: true,
      thresholdPaceSecPerKm: true,
      experienceLevel: true,
      primaryGoal: true,
      targetEventName: true,
      targetEventDate: true,
      weeklyHours: true,
      weeklySessions: true,
      units: true,
      updatedAt: true,
    },
  });
};

/** Which fields the coach would benefit from, so it can ask for them by name. */
export const missingProfileFields = (
  profile: AthleteProfileRecord | null
): string[] => {
  if (!profile) {
    return ["maxHr", "restingHr", "birthDate", "weightKg", "experienceLevel", "primaryGoal"];
  }

  const missing: string[] = [];
  if (!profile.maxHr) missing.push("maxHr");
  if (!profile.restingHr) missing.push("restingHr");
  if (!profile.birthDate) missing.push("birthDate");
  if (!profile.weightKg) missing.push("weightKg");
  if (!profile.experienceLevel) missing.push("experienceLevel");
  if (!profile.primaryGoal) missing.push("primaryGoal");
  return missing;
};
