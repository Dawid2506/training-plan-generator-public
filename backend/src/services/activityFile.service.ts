import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { getParserForFile } from "./activity-parsers/registry";
import { ActivityAnalysisPayload } from "../types/activity-analysis.types";

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

  static async getUserActivities(userId: string) {
    const prismaClient = prisma as any;

    return prismaClient.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
