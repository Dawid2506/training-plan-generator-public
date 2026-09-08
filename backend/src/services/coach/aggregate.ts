import { NormalizedActivityType } from "../../utils/activity-type";
import { ActivityIndexRow } from "./activity-index.repo";
import { HrZoneModel } from "./zones";

/**
 * Rollups over the activity index. Pure functions, no I/O.
 *
 * These live apart from the SQL deliberately: the projection is the one thing
 * Postgres is uniquely good at here (not shipping 50 MB to Node), while the
 * bucketing and trend arithmetic is branchy, unit-sensitive, shared with the
 * tool layer, and worth being able to reason about without a database.
 */

export interface SportTotals {
  sessions: number;
  distanceKm: number;
  movingHours: number;
  elevationM: number;
  avgHr: number | null;
  loadScore: number;
}

export interface PeriodTotals {
  all: SportTotals;
  bySport: Partial<Record<NormalizedActivityType, SportTotals>>;
}

export interface WeekBucket {
  /** ISO week start (Monday), as YYYY-MM-DD. */
  weekStart: string;
  totals: PeriodTotals;
}

const emptyTotals = (): SportTotals => ({
  sessions: 0,
  distanceKm: 0,
  movingHours: 0,
  elevationM: 0,
  avgHr: null,
  loadScore: 0,
});

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/**
 * A crude duration x intensity proxy - NOT TSS.
 *
 * There is no power data and no threshold HR in this dataset, so intensity is
 * approximated from average HR as a fraction of the modelled range. Without a
 * zone model it degrades to plain duration. The prompt tells the coach exactly
 * this, so it cannot present the number as something it is not.
 */
export const loadScore = (
  row: ActivityIndexRow,
  zoneModel: HrZoneModel | null
): number => {
  const minutes = row.movingTimeS / 60;
  if (minutes <= 0) {
    return 0;
  }

  if (!zoneModel || !row.avgHr) {
    return round(minutes, 0);
  }

  const floor = zoneModel.restingHrUsed ?? zoneModel.hrMaxUsed * 0.5;
  const span = zoneModel.hrMaxUsed - floor;
  if (span <= 0) {
    return round(minutes, 0);
  }

  const intensity = Math.min(Math.max((row.avgHr - floor) / span, 0), 1.2);
  // Squared so that hard sessions outweigh long easy ones, as load models do.
  return round(minutes * intensity * intensity, 0);
};

const accumulate = (
  target: SportTotals,
  row: ActivityIndexRow,
  zoneModel: HrZoneModel | null,
  hrSum: { sum: number; count: number }
): void => {
  target.sessions += 1;
  target.distanceKm += row.distanceM / 1000;
  target.movingHours += row.movingTimeS / 3600;
  target.elevationM += row.elevationM;
  target.loadScore += loadScore(row, zoneModel);

  if (row.avgHr) {
    hrSum.sum += row.avgHr;
    hrSum.count += 1;
  }
};

const finalise = (totals: SportTotals, hrSum: { sum: number; count: number }): SportTotals => ({
  sessions: totals.sessions,
  distanceKm: round(totals.distanceKm),
  movingHours: round(totals.movingHours),
  elevationM: Math.round(totals.elevationM),
  avgHr: hrSum.count > 0 ? Math.round(hrSum.sum / hrSum.count) : null,
  loadScore: Math.round(totals.loadScore),
});

export const periodTotals = (
  rows: ActivityIndexRow[],
  zoneModel: HrZoneModel | null
): PeriodTotals => {
  const all = emptyTotals();
  const allHr = { sum: 0, count: 0 };
  const bySport = new Map<
    NormalizedActivityType,
    { totals: SportTotals; hr: { sum: number; count: number } }
  >();

  for (const row of rows) {
    accumulate(all, row, zoneModel, allHr);

    let bucket = bySport.get(row.sport);
    if (!bucket) {
      bucket = { totals: emptyTotals(), hr: { sum: 0, count: 0 } };
      bySport.set(row.sport, bucket);
    }
    accumulate(bucket.totals, row, zoneModel, bucket.hr);
  }

  const result: PeriodTotals = { all: finalise(all, allHr), bySport: {} };
  for (const [sport, bucket] of bySport) {
    result.bySport[sport] = finalise(bucket.totals, bucket.hr);
  }

  return result;
};

/** Monday of the ISO week containing `date`, at UTC midnight. */
export const isoWeekStart = (date: Date): Date => {
  const copy = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  // getUTCDay is 0 for Sunday; shift so Monday is the start of the week.
  const offset = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - offset);
  return copy;
};

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Weekly buckets, gap-filled with zeros so a missed week reads as a missed week
 * rather than silently disappearing from the series.
 */
export const weeklyRollup = (
  rows: ActivityIndexRow[],
  weeks: number,
  zoneModel: HrZoneModel | null,
  now: Date = new Date()
): WeekBucket[] => {
  const currentWeek = isoWeekStart(now);
  const buckets = new Map<string, ActivityIndexRow[]>();

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = new Date(currentWeek);
    start.setUTCDate(start.getUTCDate() - index * 7);
    buckets.set(isoDate(start), []);
  }

  for (const row of rows) {
    const key = isoDate(isoWeekStart(row.startDate));
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(row);
    }
  }

  return [...buckets.entries()].map(([weekStart, weekRows]) => ({
    weekStart,
    totals: periodTotals(weekRows, zoneModel),
  }));
};

export interface TrendReport {
  windowDays: number;
  current: SportTotals;
  previous: SportTotals;
  distanceChangePct: number | null;
  loadChangePct: number | null;
}

const pctChange = (current: number, previous: number): number | null =>
  previous > 0 ? round(((current - previous) / previous) * 100, 0) : null;

const inWindow = (rows: ActivityIndexRow[], from: Date, to: Date): ActivityIndexRow[] =>
  rows.filter((row) => row.startDate >= from && row.startDate < to);

/** Last `windowDays` against the `windowDays` immediately before them. */
export const trendDelta = (
  rows: ActivityIndexRow[],
  windowDays: number,
  zoneModel: HrZoneModel | null,
  now: Date = new Date()
): TrendReport => {
  const day = 24 * 60 * 60 * 1000;
  const currentFrom = new Date(now.getTime() - windowDays * day);
  const previousFrom = new Date(now.getTime() - 2 * windowDays * day);

  const current = periodTotals(inWindow(rows, currentFrom, now), zoneModel).all;
  const previous = periodTotals(inWindow(rows, previousFrom, currentFrom), zoneModel).all;

  return {
    windowDays,
    current,
    previous,
    distanceChangePct: pctChange(current.distanceKm, previous.distanceKm),
    loadChangePct: pctChange(current.loadScore, previous.loadScore),
  };
};

/**
 * Acute-to-chronic workload ratio: the last 7 days of load against the weekly
 * average of the last 28. Above ~1.5 is the conventional spike warning.
 */
export const acuteChronicRatio = (
  rows: ActivityIndexRow[],
  zoneModel: HrZoneModel | null,
  now: Date = new Date()
): number | null => {
  const day = 24 * 60 * 60 * 1000;
  const acute = periodTotals(
    inWindow(rows, new Date(now.getTime() - 7 * day), now),
    zoneModel
  ).all.loadScore;
  const chronic = periodTotals(
    inWindow(rows, new Date(now.getTime() - 28 * day), now),
    zoneModel
  ).all.loadScore;

  if (chronic <= 0) {
    return null;
  }

  return round(acute / (chronic / 4), 2);
};

export interface ConsistencyReport {
  weeksConsidered: number;
  activeWeeks: number;
  longestStreakWeeks: number;
  avgSessionsPerWeek: number;
}

export const consistency = (
  rows: ActivityIndexRow[],
  weeks: number,
  now: Date = new Date()
): ConsistencyReport => {
  const buckets = weeklyRollup(rows, weeks, null, now);
  let activeWeeks = 0;
  let longest = 0;
  let running = 0;
  let sessions = 0;

  for (const bucket of buckets) {
    sessions += bucket.totals.all.sessions;
    if (bucket.totals.all.sessions > 0) {
      activeWeeks += 1;
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  return {
    weeksConsidered: weeks,
    activeWeeks,
    longestStreakWeeks: longest,
    avgSessionsPerWeek: round(sessions / weeks),
  };
};

export interface PersonalBests {
  longestDistanceKm: { value: number; activityId: string; date: string } | null;
  longestDurationMin: { value: number; activityId: string; date: string } | null;
  biggestClimbM: { value: number; activityId: string; date: string } | null;
  fastestAvgOver5km: { valueKmh: number; activityId: string; date: string } | null;
}

const best = <T>(
  rows: ActivityIndexRow[],
  score: (row: ActivityIndexRow) => number,
  build: (row: ActivityIndexRow, value: number) => T
): T | null => {
  let winner: ActivityIndexRow | null = null;
  let winningScore = 0;

  for (const row of rows) {
    const value = score(row);
    if (value > winningScore) {
      winningScore = value;
      winner = row;
    }
  }

  return winner ? build(winner, winningScore) : null;
};

export const personalBests = (rows: ActivityIndexRow[]): PersonalBests => {
  const stamp = (row: ActivityIndexRow) => isoDate(row.startDate);

  return {
    longestDistanceKm: best(
      rows,
      (row) => row.distanceM / 1000,
      (row, value) => ({ value: round(value), activityId: row.id, date: stamp(row) })
    ),
    longestDurationMin: best(
      rows,
      (row) => row.movingTimeS / 60,
      (row, value) => ({ value: Math.round(value), activityId: row.id, date: stamp(row) })
    ),
    biggestClimbM: best(
      rows,
      (row) => row.elevationM,
      (row, value) => ({ value: Math.round(value), activityId: row.id, date: stamp(row) })
    ),
    // Restricted to real sessions: a 400 m sprint would otherwise own this.
    fastestAvgOver5km: best(
      rows,
      (row) => (row.distanceM >= 5000 ? row.avgSpeedKmh : 0),
      (row, value) => ({ valueKmh: round(value), activityId: row.id, date: stamp(row) })
    ),
  };
};

export interface CompactSession {
  activityId: string;
  date: string;
  sport: NormalizedActivityType;
  distanceKm: number;
  durationMin: number;
  elevationM: number;
  avgHr: number | null;
  /** Pace for runs, speed for rides - never both, never the wrong one. */
  paceMinPerKm?: string;
  speedKmh?: number;
  /** Untrusted value, already sanitized. Named so the model cannot miss it. */
  name_untrusted: string;
}

const paceString = (kmh: number): string | undefined => {
  if (kmh <= 0) {
    return undefined;
  }
  const secPerKm = 3600 / kmh;
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/** One line per session - the shape the briefing and list_activities both use. */
export const sessionLine = (row: ActivityIndexRow): CompactSession => ({
  activityId: row.id,
  date: isoDate(row.startDate),
  sport: row.sport,
  distanceKm: round(row.distanceM / 1000, 2),
  durationMin: Math.round(row.movingTimeS / 60),
  elevationM: Math.round(row.elevationM),
  avgHr: row.avgHr ? Math.round(row.avgHr) : null,
  ...(row.sport === "Run"
    ? { paceMinPerKm: paceString(row.avgSpeedKmh) }
    : { speedKmh: round(row.avgSpeedKmh) }),
  name_untrusted: row.name,
});
