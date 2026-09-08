/**
 * Heart-rate, pace and power zones, computed deterministically.
 *
 * The plan generator's prompt asks the model to "calculate zones based on
 * max_heartrate", which makes the numbers unrepeatable - the same athlete gets
 * slightly different boundaries on every generation. Zones are arithmetic, so
 * they belong in code, and the coach is then told which method produced them so
 * it can be honest about the estimate it is working from.
 */

export type HrZoneMethod = "karvonen" | "percent_hrmax";

export type HrMaxSource =
  | "profile"
  | "observed"
  | "age_estimate";

export interface HrZone {
  zone: number;
  name: string;
  minBpm: number;
  maxBpm: number;
}

export interface HrZoneModel {
  zones: HrZone[];
  method: HrZoneMethod;
  hrMaxUsed: number;
  hrMaxSource: HrMaxSource;
  restingHrUsed: number | null;
}

const ZONE_NAMES = [
  "Z1 Recovery",
  "Z2 Endurance",
  "Z3 Tempo",
  "Z4 Threshold",
  "Z5 VO2Max",
] as const;

/** Fractions of HRmax (or of heart-rate reserve, under Karvonen). */
const ZONE_BOUNDS: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.6],
  [0.6, 0.7],
  [0.7, 0.8],
  [0.8, 0.9],
  [0.9, 1.0],
];

export interface ResolveHrMaxInput {
  profileMaxHr?: number | null;
  /** Highest max_heartrate seen in the trailing year, if any. */
  observedMaxHr?: number | null;
  birthDate?: Date | null;
}

export interface ResolvedHrMax {
  hrMax: number;
  source: HrMaxSource;
}

/**
 * Resolve a usable HRmax, preferring what the athlete told us over what we
 * inferred. The observed value is floored at 120 because a chest strap dropout
 * or a phantom cadence-lock reading would otherwise define the whole model.
 */
export const resolveHrMax = (input: ResolveHrMaxInput): ResolvedHrMax | null => {
  if (input.profileMaxHr && input.profileMaxHr >= 100) {
    return { hrMax: input.profileMaxHr, source: "profile" };
  }

  if (input.observedMaxHr && input.observedMaxHr >= 120) {
    return { hrMax: Math.round(input.observedMaxHr), source: "observed" };
  }

  if (input.birthDate) {
    const ageMs = Date.now() - input.birthDate.getTime();
    const age = ageMs / (365.25 * 24 * 60 * 60 * 1000);
    if (age >= 10 && age <= 100) {
      // Nes et al. - better calibrated across ages than the folk 220 - age.
      return { hrMax: Math.round(211 - 0.64 * age), source: "age_estimate" };
    }
  }

  return null;
};

export interface ComputeHrZonesInput extends ResolveHrMaxInput {
  restingHr?: number | null;
}

/**
 * Karvonen (percentage of heart-rate reserve) when a resting HR is known,
 * otherwise plain percentages of HRmax. Returns null rather than guessing when
 * there is nothing to anchor on - the caller is expected to say which field is
 * missing instead of inventing a number.
 */
export const computeHrZones = (
  input: ComputeHrZonesInput
): HrZoneModel | null => {
  const resolved = resolveHrMax(input);
  if (!resolved) {
    return null;
  }

  const resting =
    input.restingHr && input.restingHr >= 25 && input.restingHr < resolved.hrMax
      ? input.restingHr
      : null;

  const method: HrZoneMethod = resting ? "karvonen" : "percent_hrmax";
  const toBpm = (fraction: number): number =>
    resting
      ? Math.round(resting + fraction * (resolved.hrMax - resting))
      : Math.round(fraction * resolved.hrMax);

  return {
    zones: ZONE_BOUNDS.map(([low, high], index) => ({
      zone: index + 1,
      name: ZONE_NAMES[index],
      minBpm: toBpm(low),
      maxBpm: toBpm(high),
    })),
    method,
    hrMaxUsed: resolved.hrMax,
    hrMaxSource: resolved.source,
    restingHrUsed: resting,
  };
};

/** Which zone a single heart-rate sample falls in; 0 means below Z1. */
export const zoneForBpm = (model: HrZoneModel, bpm: number): number => {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    return 0;
  }

  for (let index = model.zones.length - 1; index >= 0; index -= 1) {
    if (bpm >= model.zones[index].minBpm) {
      return model.zones[index].zone;
    }
  }

  return 0;
};

export interface PaceZone {
  name: string;
  minSecPerKm: number;
  maxSecPerKm: number;
}

/**
 * Pace zones off threshold pace, using Daniels-style multipliers. Slower paces
 * are larger numbers, so the multipliers read inverted compared with HR.
 */
export const computePaceZones = (
  thresholdPaceSecPerKm?: number | null
): PaceZone[] | null => {
  if (!thresholdPaceSecPerKm || thresholdPaceSecPerKm < 120) {
    return null;
  }

  const t = thresholdPaceSecPerKm;
  return [
    { name: "Easy", minSecPerKm: Math.round(t * 1.25), maxSecPerKm: Math.round(t * 1.45) },
    { name: "Marathon", minSecPerKm: Math.round(t * 1.1), maxSecPerKm: Math.round(t * 1.25) },
    { name: "Threshold", minSecPerKm: Math.round(t * 0.98), maxSecPerKm: Math.round(t * 1.05) },
    { name: "Interval", minSecPerKm: Math.round(t * 0.9), maxSecPerKm: Math.round(t * 0.97) },
    { name: "Repetition", minSecPerKm: Math.round(t * 0.82), maxSecPerKm: Math.round(t * 0.9) },
  ];
};

export interface PowerZone {
  zone: number;
  name: string;
  minWatts: number;
  maxWatts: number;
}

/** Coggan power zones from FTP. */
export const computePowerZones = (ftpWatts?: number | null): PowerZone[] | null => {
  if (!ftpWatts || ftpWatts < 50) {
    return null;
  }

  const bounds: ReadonlyArray<readonly [string, number, number]> = [
    ["Active Recovery", 0, 0.55],
    ["Endurance", 0.55, 0.75],
    ["Tempo", 0.75, 0.9],
    ["Threshold", 0.9, 1.05],
    ["VO2Max", 1.05, 1.2],
    ["Anaerobic", 1.2, 1.5],
  ];

  return bounds.map(([name, low, high], index) => ({
    zone: index + 1,
    name,
    minWatts: Math.round(low * ftpWatts),
    maxWatts: Math.round(high * ftpWatts),
  }));
};
