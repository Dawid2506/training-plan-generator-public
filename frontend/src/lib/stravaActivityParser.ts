import { SavedActivity, StravaActivity } from "@/types/strava";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const asArrayFromPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = [
    payload.data,
    payload.activities,
    payload.results,
    payload.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (isRecord(candidate) && Array.isArray(candidate.items)) {
      return candidate.items;
    }
  }

  return [];
};

export const normalizeActivitiesPayload = (payload: unknown): StravaActivity[] => {
  const list = asArrayFromPayload(payload);
  return list.filter((item): item is StravaActivity => isRecord(item)) as StravaActivity[];
};

const toNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const toSavedActivity = (item: unknown): SavedActivity | null => {
  if (!isRecord(item)) {
    return null;
  }

  const sourceType =
    item.sourceType === "FILE" || item.sourceType === "STRAVA"
      ? item.sourceType
      : undefined;

  const sourceFileName =
    typeof item.sourceFileName === "string" ? item.sourceFileName : undefined;

  const format =
    item.format === "fit" || item.format === "strava" ? item.format : undefined;

  const workoutFocus =
    typeof item.workoutFocus === "string" ? item.workoutFocus : undefined;

  const nestedActivity = isRecord(item.activity)
      ? (item.activity as unknown as StravaActivity)
    : null;
    const flatActivity = isRecord(item)
      ? (item as unknown as StravaActivity)
      : null;

  const activity = nestedActivity ?? flatActivity;
  if (!activity || !isRecord(activity)) {
    return null;
  }

  const activityId =
    toNumericId(item.activityId) ??
    toNumericId(item.stravaActivityId) ??
    toNumericId(activity.id) ??
    null;

  return {
    id: typeof item.id === "string" || typeof item.id === "number" ? item.id : undefined,
    activityId,
    savedAt:
      typeof item.savedAt === "string"
        ? item.savedAt
        : typeof item.saved_at === "string"
          ? item.saved_at
          : typeof item.createdAt === "string"
            ? item.createdAt
            : undefined,
    sourceType,
    sourceFileName,
    format,
    workoutFocus,
    activity: activity as StravaActivity,
  };
};

export const normalizeSavedActivitiesPayload = (payload: unknown): SavedActivity[] => {
  const list = asArrayFromPayload(payload);
  return list
    .map(toSavedActivity)
    .filter((item): item is SavedActivity => item !== null);
};
