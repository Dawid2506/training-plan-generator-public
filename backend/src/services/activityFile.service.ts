import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { getParserForFile } from "./activity-parsers/registry";
import {
  ActivityAnalysisEntry,
  ActivityAnalysisPayload,
} from "../types/activity-analysis.types";
import { normalizeActivityType } from "../utils/activity-type";

export class ActivityFileService {
  static async parseFile(params: {
    buffer: Buffer;
    fileName: string;
    workoutFocus: string;
  }): Promise<ActivityAnalysisPayload> {
    const parser = getParserForFile(params.fileName);
    const parsed = await parser.parse({
      buffer: params.buffer,
      fileName: params.fileName,
    });

    return {
      workoutFocus: params.workoutFocus,
      analysisData: [parsed.analysis],
    };
  }

  static async saveParsedActivity(params: {
    userId: string;
    fileName: string;
    format: string;
    workoutFocus: string;
    payload: ActivityAnalysisPayload;
  }) {
    const prismaClient = prisma as any;

    return prismaClient.userActivity.create({
      data: {
        userId: params.userId,
        sourceFileName: params.fileName,
        format: params.format,
        sourceType: "FILE",
        workoutFocus: params.workoutFocus,
        payload: params.payload as unknown as Prisma.InputJsonValue,
      },
    });
  }

  static async getUserActivities(
    userId: string,
    options?: { sourceType?: "FILE" | "STRAVA" }
  ) {
    const prismaClient = prisma as any;

    return prismaClient.userActivity.findMany({
      where: {
        userId,
        ...(options?.sourceType ? { sourceType: options.sourceType } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Both FILE and STRAVA rows keep their streams under `payload.analysisData`,
   * so plan generation can read them straight from the database.
   */
  static getAnalysisEntries(payload: unknown): ActivityAnalysisEntry[] {
    const analysisData = (payload as { analysisData?: unknown })?.analysisData;

    if (!Array.isArray(analysisData)) {
      return [];
    }

    return analysisData.filter(
      (entry): entry is ActivityAnalysisEntry =>
        typeof entry === "object" && entry !== null && "activity" in entry
    );
  }

  static getActivityType(activityRow: { payload?: unknown }): string {
    const [entry] = this.getAnalysisEntries(activityRow.payload);
    return normalizeActivityType(entry?.activity?.type);
  }

  static async getFileActivitiesByIds(params: {
    userId: string;
    activityIds: string[];
  }) {
    const prismaClient = prisma as any;

    return prismaClient.userActivity.findMany({
      where: {
        userId: params.userId,
        sourceType: "FILE",
        id: { in: params.activityIds },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getRecentFileActivities(params: {
    userId: string;
    activityType?: string;
    count: number;
  }) {
    const activities = await this.getUserActivities(params.userId, {
      sourceType: "FILE",
    });

    const requestedType = params.activityType
      ? normalizeActivityType(params.activityType)
      : undefined;

    const matching =
      requestedType && requestedType !== "Other"
        ? activities.filter(
            (activity: { payload?: unknown }) =>
              this.getActivityType(activity) === requestedType
          )
        : activities;

    return matching.slice(0, params.count);
  }
}
