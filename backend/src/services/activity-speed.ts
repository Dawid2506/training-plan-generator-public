/**
 * One place that answers "how fast was this ride, in km/h".
 *
 * The stored `average_speed` header cannot be read without knowing where the
 * row came from: Strava writes metres per second, while the FIT importer
 * converts to km/h on the way in (see analysis-normalizer.ts). Handing that raw
 * number to the client left the frontend guessing, and it guessed m/s for
 * everything - so every imported ride rendered its speed multiplied by 3.6.
 *
 * `distance / moving_time` is metres per second on both import paths, so it is
 * the unambiguous source and is preferred whenever both are present. It also
 * keeps the figure honest against the moving time shown beside it: the FIT
 * header falls back to elapsed time when the file carries no avg_speed field,
 * which describes a slower ride than the one the card is captioned with.
 *
 * The same rule is expressed in SQL in coach/activity-index.repo.ts. The two
 * must agree - change them together.
 */

const MPS_TO_KMH = 3.6;

type SourceType = string | null | undefined;

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Three decimals is what the FIT importer already stores; matching it keeps
 * a normalised row byte-identical to one that needed no conversion. */
const round = (value: number): number => Number(value.toFixed(3));

const asRecord = (activity: unknown): Record<string, unknown> | null =>
  activity && typeof activity === 'object' ? (activity as Record<string, unknown>) : null;

/** m/s on Strava rows, already km/h on FIT rows. */
const declaredToKmh = (declared: number, sourceType: SourceType): number =>
  sourceType === 'STRAVA' ? declared * MPS_TO_KMH : declared;

export const averageSpeedKmh = (activity: unknown, sourceType: SourceType): number => {
  const record = asRecord(activity);
  if (!record) return 0;

  const distance = toNumber(record.distance);
  const movingTime = toNumber(record.moving_time);

  if (distance > 0 && movingTime > 0) {
    return round((distance / movingTime) * MPS_TO_KMH);
  }

  const declared = toNumber(record.average_speed);
  return declared > 0 ? round(declaredToKmh(declared, sourceType)) : 0;
};

/** No derived equivalent: a maximum cannot be recovered from the totals. */
export const maxSpeedKmh = (activity: unknown, sourceType: SourceType): number => {
  const record = asRecord(activity);
  if (!record) return 0;

  const declared = toNumber(record.max_speed);
  return declared > 0 ? round(declaredToKmh(declared, sourceType)) : 0;
};

/**
 * The activity as the API should hand it over: every speed in km/h.
 *
 * Read-time normalisation on purpose. The stored payload stays exactly as the
 * importer wrote it, so nothing needs backfilling and the coach's own SQL keeps
 * reading the rows it was written against.
 */
export const withSpeedInKmh = <T>(activity: T, sourceType: SourceType): T => {
  if (!asRecord(activity)) return activity;

  return {
    ...(activity as Record<string, unknown>),
    average_speed: averageSpeedKmh(activity, sourceType),
    max_speed: maxSpeedKmh(activity, sourceType),
  } as T;
};
