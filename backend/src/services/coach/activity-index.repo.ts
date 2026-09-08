import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { normalizeActivityType, NormalizedActivityType } from "../../utils/activity-type";
import { ActivityFileService } from "../activityFile.service";
import { FIELD, sanitizeUntrusted } from "./sanitize";
import * as audit from "./audit";

/**
 * A compact, unit-normalised index over an athlete's whole training history.
 *
 * The expensive part of UserActivity is `payload.analysisData[].streams`: at a
 * sample every 15 seconds an hour-long session is 25-40 KB of JSONB and a long
 * ride is closer to 150 KB. The part the coach needs in order to answer most
 * questions is the ~400-byte `activity` header. So the projection happens in
 * Postgres and Node never deserialises a stream unless a tool asks for one
 * specific session.
 *
 * Streams are still read for the one-activity-deep tools; this module exists so
 * that "how much did I run in May" does not have to pull a year of them.
 */

export interface ActivityIndexRow {
  /** UserActivity.id - the only activity identifier ever shown to the model. */
  id: string;
  sourceType: "FILE" | "STRAVA";
  /** Untrusted: comes from Strava or from an uploaded file. Already sanitized. */
  name: string;
  /** Untrusted: the uploaded file's own name. Already sanitized. */
  sourceFileName: string;
  sport: NormalizedActivityType;
  startDate: Date;
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  elevationM: number;
  avgHr: number | null;
  maxHr: number | null;
  avgSpeedKmh: number;
  /** Whether speed came from distance/time or from the stored header field. */
  speedSource: "derived" | "declared";
  /**
   * Injection signals per untrusted field, kept apart so the audit log can name
   * which value carried them rather than guessing.
   */
  signals: { name: string[]; fileName: string[] };
}

interface RawIndexRow {
  id: string;
  source_type: string;
  source_file_name: string | null;
  name: string | null;
  type: string | null;
  start_date: Date | null;
  distance_m: number | null;
  moving_time_s: number | null;
  elapsed_time_s: number | null;
  elevation_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_speed_kmh: number | null;
  speed_derived: boolean | null;
}

/** Absolute ceiling, whatever a caller asks for. */
const MAX_ROWS = 5_000;
const DEFAULT_ROWS = 2_000;

export interface LoadIndexOptions {
  from?: Date;
  to?: Date;
  limit?: number;
}

/**
 * The projection.
 *
 * Every numeric cast is guarded by jsonb_typeof, because a single malformed
 * payload would otherwise take down every coach request with a cast error
 * rather than just being one odd row.
 *
 * On speed: `distance / moving_time` is metres per second on both import paths,
 * so it is the unambiguous source. The stored `average_speed` header is m/s for
 * Strava rows but km/h for FIT rows (analysis-normalizer converts on import),
 * so it is only a fallback and only with the sourceType telling us which.
 */
const buildQuery = (
  userId: string,
  from: Date | null,
  to: Date | null,
  limit: number
): Prisma.Sql => Prisma.sql`
  SELECT
    ua.id,
    ua."sourceType"::text AS source_type,
    ua."sourceFileName"   AS source_file_name,
    a->>'name'            AS name,
    a->>'type'            AS type,
    COALESCE(
      CASE WHEN a->>'start_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
           THEN (a->>'start_date')::timestamptz END,
      ua."createdAt") AS start_date,
    CASE WHEN jsonb_typeof(a->'distance')             = 'number' THEN (a->>'distance')::float             ELSE 0 END AS distance_m,
    CASE WHEN jsonb_typeof(a->'moving_time')          = 'number' THEN (a->>'moving_time')::float          ELSE 0 END AS moving_time_s,
    CASE WHEN jsonb_typeof(a->'elapsed_time')         = 'number' THEN (a->>'elapsed_time')::float         ELSE 0 END AS elapsed_time_s,
    CASE WHEN jsonb_typeof(a->'total_elevation_gain') = 'number' THEN (a->>'total_elevation_gain')::float ELSE 0 END AS elevation_m,
    NULLIF(CASE WHEN jsonb_typeof(a->'average_heartrate') = 'number' THEN (a->>'average_heartrate')::float ELSE 0 END, 0) AS avg_hr,
    NULLIF(CASE WHEN jsonb_typeof(a->'max_heartrate')     = 'number' THEN (a->>'max_heartrate')::float     ELSE 0 END, 0) AS max_hr,
    CASE
      WHEN jsonb_typeof(a->'distance') = 'number'
       AND jsonb_typeof(a->'moving_time') = 'number'
       AND (a->>'moving_time')::float > 0
       AND (a->>'distance')::float > 0
        THEN (a->>'distance')::float / (a->>'moving_time')::float * 3.6
      WHEN ua."sourceType" = 'STRAVA' AND jsonb_typeof(a->'average_speed') = 'number'
        THEN (a->>'average_speed')::float * 3.6
      WHEN jsonb_typeof(a->'average_speed') = 'number'
        THEN (a->>'average_speed')::float
      ELSE 0
    END AS avg_speed_kmh,
    (jsonb_typeof(a->'distance') = 'number'
     AND jsonb_typeof(a->'moving_time') = 'number'
     AND (a->>'moving_time')::float > 0) AS speed_derived
  FROM "UserActivity" ua
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(ua.payload->'analysisData') = 'array'
         THEN ua.payload->'analysisData'
         ELSE '[]'::jsonb END) AS entry(value)
  CROSS JOIN LATERAL (SELECT entry.value->'activity') AS act(a)
  WHERE ua."userId" = ${userId}
    AND jsonb_typeof(a) = 'object'
    AND (${from}::timestamptz IS NULL OR COALESCE(
          CASE WHEN a->>'start_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
               THEN (a->>'start_date')::timestamptz END,
          ua."createdAt") >= ${from}::timestamptz)
    AND (${to}::timestamptz IS NULL OR COALESCE(
          CASE WHEN a->>'start_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
               THEN (a->>'start_date')::timestamptz END,
          ua."createdAt") <= ${to}::timestamptz)
  ORDER BY start_date DESC NULLS LAST
  LIMIT ${limit}
`;

const toRow = (raw: RawIndexRow): ActivityIndexRow => {
  const name = sanitizeUntrusted(raw.name, FIELD.activityName);
  const fileName = sanitizeUntrusted(raw.source_file_name, FIELD.fileName);

  return {
    id: raw.id,
    sourceType: raw.source_type === "STRAVA" ? "STRAVA" : "FILE",
    name: name.text,
    sourceFileName: fileName.text,
    // Coerce to the closed union rather than letting a raw sport string through.
    sport: normalizeActivityType(raw.type),
    startDate: raw.start_date ?? new Date(0),
    distanceM: raw.distance_m ?? 0,
    movingTimeS: raw.moving_time_s ?? 0,
    elapsedTimeS: raw.elapsed_time_s ?? 0,
    elevationM: raw.elevation_m ?? 0,
    avgHr: raw.avg_hr,
    maxHr: raw.max_hr,
    avgSpeedKmh: raw.avg_speed_kmh ?? 0,
    speedSource: raw.speed_derived ? "derived" : "declared",
    signals: {
      name: name.suspicious ? name.signals : [],
      fileName: fileName.suspicious ? fileName.signals : [],
    },
  };
};

/**
 * Degraded path. If the projection ever breaks - a schema change, a Postgres
 * version difference - the coach should answer from less data rather than fail
 * outright, so this reads a bounded slice and extracts in TypeScript.
 */
const loadViaFallback = async (
  userId: string,
  limit: number
): Promise<ActivityIndexRow[]> => {
  const rows = (await (prisma as any).userActivity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 300),
  })) as Array<{
    id: string;
    sourceType: string;
    sourceFileName: string;
    payload: unknown;
  }>;

  return rows.flatMap((row) => {
    const [entry] = ActivityFileService.getAnalysisEntries(row.payload);
    if (!entry?.activity) {
      return [];
    }

    const activity = entry.activity;
    const movingTime = Number(activity.moving_time) || 0;
    const distance = Number(activity.distance) || 0;
    const declared = Number(activity.average_speed) || 0;
    const derived = movingTime > 0 && distance > 0;

    return [
      toRow({
        id: row.id,
        source_type: row.sourceType,
        source_file_name: row.sourceFileName,
        name: activity.name,
        type: activity.type,
        start_date: activity.start_date ? new Date(activity.start_date) : null,
        distance_m: distance,
        moving_time_s: movingTime,
        elapsed_time_s: Number(activity.elapsed_time) || 0,
        elevation_m: Number(activity.total_elevation_gain) || 0,
        avg_hr: Number(activity.average_heartrate) || null,
        max_hr: Number(activity.max_heartrate) || null,
        avg_speed_kmh: derived
          ? (distance / movingTime) * 3.6
          : row.sourceType === "STRAVA"
            ? declared * 3.6
            : declared,
        speed_derived: derived,
      }),
    ];
  });
};

export const loadActivityIndex = async (
  userId: string,
  options: LoadIndexOptions = {}
): Promise<ActivityIndexRow[]> => {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_ROWS, 1), MAX_ROWS);

  try {
    const raw = await prisma.$queryRaw<RawIndexRow[]>(
      buildQuery(userId, options.from ?? null, options.to ?? null, limit)
    );
    return raw.map(toRow);
  } catch (error) {
    console.error("coach activity index projection failed, degrading", error);
    return loadViaFallback(userId, limit);
  }
};

/**
 * Report every untrusted field that carried an injection signal. Called once
 * per turn so a poisoned activity name is findable by its row id.
 */
export const auditIndexSignals = (
  rows: ActivityIndexRow[],
  context: { userId: string; sessionId?: string; messageId?: string }
): void => {
  for (const row of rows) {
    if (row.signals.name.length > 0) {
      audit.injectionSignal({
        ...context,
        source: "activity_name",
        activityId: row.id,
        signals: row.signals.name,
        text: row.name,
      });
    }

    if (row.signals.fileName.length > 0) {
      audit.injectionSignal({
        ...context,
        source: "file_name",
        activityId: row.id,
        signals: row.signals.fileName,
        text: row.sourceFileName,
      });
    }
  }
};
