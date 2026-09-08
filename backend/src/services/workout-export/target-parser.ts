/**
 * The target fields of an IntervalPlan are free text produced by the model
 * ("160-175", "5:00-6:00 min/km", "25-30 km/h"), while a FIT workout step needs
 * numbers. These parsers turn the usual shapes into ranges and return null for
 * anything they do not recognise, so an unparseable target degrades to an open
 * step instead of failing the whole export.
 */

export interface NumericRange {
  low: number;
  high: number;
}

const MIN_PLAUSIBLE_BPM = 30;
const MAX_PLAUSIBLE_BPM = 240;

/** Half-width applied when the model gives a single value instead of a range. */
const HR_SINGLE_VALUE_MARGIN_BPM = 5;
const PACE_SINGLE_VALUE_MARGIN_SEC = 10;
const SPEED_SINGLE_VALUE_MARGIN_KMH = 1;

const METERS_PER_MILE = 1609.344;

const orderedRange = (a: number, b: number): NumericRange => ({
  low: Math.min(a, b),
  high: Math.max(a, b),
});

/**
 * "160-175", "160-175 bpm", "~150", "150 bpm" -> beats per minute range.
 * A single value is widened by a few beats so the watch is not permanently
 * out of range.
 */
export const parseHeartRateRange = (input: string | undefined): NumericRange | null => {
  if (!input) return null;

  const beats = (input.match(/\d+/g) ?? [])
    .map(Number)
    .filter((value) => value >= MIN_PLAUSIBLE_BPM && value <= MAX_PLAUSIBLE_BPM);

  if (beats.length === 0) return null;
  if (beats.length === 1) {
    return {
      low: beats[0] - HR_SINGLE_VALUE_MARGIN_BPM,
      high: beats[0] + HR_SINGLE_VALUE_MARGIN_BPM,
    };
  }

  return orderedRange(beats[0], beats[1]);
};

/**
 * "5:00-6:00 min/km", "5:30 min/km", "8:00-9:00 min/mi" -> speed range in m/s.
 * Note the inversion: the slower pace (more seconds) is the *lower* speed.
 */
export const parsePaceRange = (input: string | undefined): NumericRange | null => {
  if (!input) return null;

  const clockValues = input.match(/\d{1,3}:\d{2}/g);
  if (!clockValues || clockValues.length === 0) return null;

  const perMile = /\bmi\b|mile|min\/mi/i.test(input);
  const distanceMeters = perMile ? METERS_PER_MILE : 1000;

  const toSeconds = (clock: string) => {
    const [minutes, seconds] = clock.split(":").map(Number);
    return minutes * 60 + seconds;
  };

  const paceSeconds = clockValues.map(toSeconds).filter((seconds) => seconds > 0);
  if (paceSeconds.length === 0) return null;

  const [first, second] =
    paceSeconds.length === 1
      ? [
          paceSeconds[0] + PACE_SINGLE_VALUE_MARGIN_SEC,
          Math.max(1, paceSeconds[0] - PACE_SINGLE_VALUE_MARGIN_SEC),
        ]
      : [paceSeconds[0], paceSeconds[1]];

  return orderedRange(distanceMeters / first, distanceMeters / second);
};

/**
 * "25-30 km/h", "28 km/h", "15-18 mph" -> speed range in m/s.
 */
export const parseSpeedRange = (input: string | undefined): NumericRange | null => {
  if (!input) return null;
  if (!/km\s*\/\s*h|kph|km\/godz|mph|m\/s/i.test(input)) return null;

  const values = (input.match(/\d+(?:[.,]\d+)?/g) ?? []).map((value) =>
    Number(value.replace(",", "."))
  );
  if (values.length === 0) return null;

  const toMetersPerSecond = (value: number) => {
    if (/m\s*\/\s*s/i.test(input)) return value;
    if (/mph/i.test(input)) return (value * METERS_PER_MILE) / 3600;
    return value / 3.6;
  };

  const [first, second] =
    values.length === 1
      ? [
          Math.max(0.1, values[0] - SPEED_SINGLE_VALUE_MARGIN_KMH),
          values[0] + SPEED_SINGLE_VALUE_MARGIN_KMH,
        ]
      : [values[0], values[1]];

  return orderedRange(toMetersPerSecond(first), toMetersPerSecond(second));
};

/**
 * A pace/speed field can hold either notation depending on the sport, so try
 * both: "min/km" style first, then "km/h" style.
 */
export const parsePaceOrSpeedRange = (input: string | undefined): NumericRange | null =>
  parsePaceRange(input) ?? parseSpeedRange(input);
