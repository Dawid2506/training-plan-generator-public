export type NormalizedActivityType = "Run" | "Ride" | "Other";

const RUN_HINTS = ["run", "jog", "treadmill"];
const RIDE_HINTS = ["ride", "bike", "biking", "cycl", "spin", "velo"];

/**
 * Strava reports "Run" / "Ride" while FIT files carry their raw sport message
 * ("running", "cycling", "virtual_ride"), so both are mapped onto one vocabulary.
 */
export const normalizeActivityType = (value: unknown): NormalizedActivityType => {
  const raw = typeof value === "string" ? value.toLowerCase() : "";

  if (RIDE_HINTS.some((hint) => raw.includes(hint))) {
    return "Ride";
  }

  if (RUN_HINTS.some((hint) => raw.includes(hint))) {
    return "Run";
  }

  return "Other";
};

export const activityTypeLabel = (value: unknown): string => {
  const normalized = normalizeActivityType(value);

  if (normalized === "Ride") {
    return "Bike";
  }

  if (normalized === "Run") {
    return "Run";
  }

  return typeof value === "string" && value.trim() ? value : "Other";
};
