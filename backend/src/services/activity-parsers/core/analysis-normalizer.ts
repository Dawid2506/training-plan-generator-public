import {
  ActivityDataPoint,
  ActivitySplit,
  ParsedActivity,
} from "../../../types/activity-analysis.types";

type FitRecord = Record<string, unknown>;

const FIT_RESAMPLE_SECONDS = 15;

const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const interpolateSeries = (
  sourceTime: number[],
  sourceValues: Array<number | null>,
  targetTime: number[],
  fallback = 0
): number[] => {
  const points: Array<{ t: number; v: number }> = [];

  for (let i = 0; i < sourceTime.length; i += 1) {
    const value = sourceValues[i];

    if (value !== null && Number.isFinite(value)) {
      points.push({ t: sourceTime[i], v: value });
    }
  }

  if (points.length === 0) {
    return targetTime.map(() => fallback);
  }

  if (points.length === 1) {
    return targetTime.map(() => points[0].v);
  }

  const output: number[] = [];

  for (const target of targetTime) {
    if (target <= points[0].t) {
      output.push(points[0].v);
      continue;
    }

    if (target >= points[points.length - 1].t) {
      output.push(points[points.length - 1].v);
      continue;
    }

    let right = 1;
    while (right < points.length && points[right].t < target) {
      right += 1;
    }

    const left = right - 1;
    const leftPoint = points[left];
    const rightPoint = points[right];
    const duration = rightPoint.t - leftPoint.t;

    if (duration <= 0) {
      output.push(leftPoint.v);
      continue;
    }

    const ratio = (target - leftPoint.t) / duration;
    output.push(leftPoint.v + ratio * (rightPoint.v - leftPoint.v));
  }

  return output;
};

export const buildDataPoints = (records: FitRecord[]): ActivityDataPoint[] => {
  if (!records.length) {
    return [];
  }

  const normalized = records
    .map((record) => {
      const timestamp = new Date(String(record.timestamp));
      const epochMs = Number.isNaN(timestamp.getTime())
        ? null
        : timestamp.getTime();

      return {
        epochMs,
        distance: record.distance,
        speed: record.enhanced_speed,
        heartRate: record.heart_rate,
        grade: record.grade,
        altitude:
          record.enhanced_altitude !== undefined
            ? record.enhanced_altitude
            : record.altitude,
      };
    })
    .filter((row) => row.epochMs !== null)
    .sort((a, b) => (a.epochMs as number) - (b.epochMs as number));

  if (!normalized.length) {
    return [];
  }

  const startEpochMs = normalized[0].epochMs as number;
  const sourceTime = normalized.map((row) => ((row.epochMs as number) - startEpochMs) / 1000);
  const maxSeconds = Math.max(0, Math.floor(sourceTime[sourceTime.length - 1]));
  const targetTime: number[] = [];

  for (let second = 0; second <= maxSeconds; second += FIT_RESAMPLE_SECONDS) {
    targetTime.push(second);
  }

  const distanceSeries = interpolateSeries(
    sourceTime,
    normalized.map((row) => {
      const value = Number(row.distance);
      return Number.isFinite(value) ? value : null;
    }),
    targetTime,
    0
  );

  const speedSeriesKmh = interpolateSeries(
    sourceTime,
    normalized.map((row) => {
      const value = Number(row.speed);
      return Number.isFinite(value) ? value * 3.6 : null;
    }),
    targetTime,
    0
  );

  const heartrateSeries = interpolateSeries(
    sourceTime,
    normalized.map((row) => {
      const value = Number(row.heartRate);
      return Number.isFinite(value) ? value : null;
    }),
    targetTime,
    0
  );

  const gradeSeries = interpolateSeries(
    sourceTime,
    normalized.map((row) => {
      const value = Number(row.grade);
      return Number.isFinite(value) ? value : null;
    }),
    targetTime,
    0
  );

  const altitudeSeries = interpolateSeries(
    sourceTime,
    normalized.map((row) => {
      const value = Number(row.altitude);
      return Number.isFinite(value) ? value : null;
    }),
    targetTime,
    0
  );

  return targetTime.map((time, index) => ({
    time,
    distance: Number(distanceSeries[index]),
    speed: Number(Math.max(0, speedSeriesKmh[index])),
    heartrate: Math.round(Math.max(0, heartrateSeries[index])),
    grade: Number(gradeSeries[index]),
    altitude: Number(altitudeSeries[index]),
  }));
};

export const buildSplitsFromDataPoints = (
  dataPoints: ActivityDataPoint[]
): ActivitySplit[] => {
  const positiveDistance = dataPoints.filter((point) => point.distance > 0);
  if (!positiveDistance.length) {
    return [];
  }

  const buckets = new Map<number, ActivityDataPoint[]>();

  for (const point of positiveDistance) {
    const km = Math.floor(point.distance / 1000) + 1;
    const existing = buckets.get(km) || [];
    existing.push(point);
    buckets.set(km, existing);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([km, points]) => {
      const speeds = points.map((point) => point.speed);
      const heartrates = points.map((point) => point.heartrate);
      const grades = points.map((point) => point.grade);
      const avg = (values: number[]) =>
        values.length
          ? values.reduce((acc, value) => acc + value, 0) / values.length
          : 0;

      return {
        km,
        avgSpeed: avg(speeds),
        avgHeartrate: Math.round(avg(heartrates)),
        avgGrade: avg(grades),
        maxSpeed: speeds.length ? Math.max(...speeds) : 0,
        minSpeed: speeds.length ? Math.min(...speeds) : 0,
      };
    });
};

export const buildActivityFromSession = (
  sessions: FitRecord[],
  fallbackType: string
): ParsedActivity => {
  const session = sessions[0] || {};

  const startTime = session.start_time
    ? new Date(String(session.start_time)).toISOString()
    : new Date().toISOString();

  const totalDistance = toNumber(session.total_distance, 0);
  const elapsedTime = Math.floor(toNumber(session.total_elapsed_time, 0));
  const movingTime = Math.floor(
    toNumber(session.total_timer_time, elapsedTime)
  );

  let averageSpeed = toNumber(session.avg_speed, 0) * 3.6;
  if (!averageSpeed && elapsedTime > 0) {
    averageSpeed = (totalDistance / elapsedTime) * 3.6;
  }

  return {
    id: Number(Date.now()),
    name: String(session.sport || "Imported FIT Activity"),
    type: fallbackType,
    distance: Math.floor(totalDistance),
    moving_time: movingTime,
    elapsed_time: elapsedTime,
    total_elevation_gain: Math.floor(toNumber(session.total_ascent, 0)),
    average_speed: Number(averageSpeed.toFixed(3)),
    max_speed: Number((toNumber(session.max_speed, 0) * 3.6).toFixed(3)),
    average_heartrate: Math.floor(toNumber(session.avg_heart_rate, 0)),
    max_heartrate: Math.floor(toNumber(session.max_heart_rate, 0)),
    start_date: startTime,
  };
};
