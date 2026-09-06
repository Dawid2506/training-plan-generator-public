export type NormalizedActivityType = "Run" | "Ride" | "Other";

const RUN_HINTS = ["run", "jog", "treadmill"];
const RIDE_HINTS = ["ride", "bike", "biking", "cycl", "spin", "velo"];

/**
 * Activity sources do not agree on how a sport is named. Strava uses "Run" / "Ride",
 * while FIT files carry the raw sport message ("running", "cycling", "virtual_ride").
 * This maps every known spelling onto the two sports the planner supports.
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
