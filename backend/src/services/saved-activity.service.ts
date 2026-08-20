import { prisma } from '../prisma/client';
import { Prisma } from '@prisma/client';
import {
  StravaActivityPayload,
  SavedActivityResponse,
  StravaAnalysisDataItem,
  SavedActivityPayload,
} from '../types/saved-activity.dto';

export class SavedActivityService {
  private getActivityFromPayload(payload: unknown): StravaActivityPayload | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const candidate = payload as {
      analysisData?: Array<{ activity?: StravaActivityPayload }>;
      id?: number;
    };

    if (Array.isArray(candidate.analysisData) && candidate.analysisData[0]?.activity) {
      return candidate.analysisData[0].activity;
    }

    // Backward compatibility for records saved as plain activity object
    if (typeof candidate.id === 'number') {
      return payload as StravaActivityPayload;
    }

    return null;
  }

  /**
   * Save a Strava activity for a user
   * Returns 409 conflict if duplicate (user already saved this activityId)
   */
  async saveActivity(
    userId: string,
    analysisItem: StravaAnalysisDataItem
  ): Promise<{ success: boolean; data: SavedActivityResponse; statusCode: number }> {
    try {
      const prismaClient = prisma as any;
      const activity = analysisItem.activity;
      const existing = await prismaClient.userActivity.findFirst({
        where: {
          userId,
          sourceType: 'STRAVA',
          externalActivityId: BigInt(activity.id),
        },
      });

      if (existing) {
        const parsedActivity = this.getActivityFromPayload(existing.payload as unknown);
        return {
          success: true,
          statusCode: 409,
          data: {
            id: existing.id,
            activityId: Number(existing.externalActivityId),
            savedAt: existing.createdAt.toISOString(),
            activity: parsedActivity || activity,
            analysisData: (existing.payload as unknown as SavedActivityPayload).analysisData,
          },
        };
      }

      const payloadToSave: SavedActivityPayload = {
        analysisData: [analysisItem],
      };

      const saved = await prismaClient.userActivity.create({
        data: {
          userId,
          sourceFileName: `strava-${activity.id}`,
          format: 'strava',
          sourceType: 'STRAVA',
          externalActivityId: BigInt(activity.id),
          workoutFocus: 'Base',
          payload: payloadToSave as unknown as Prisma.InputJsonValue,
        },
      });

      const savedPayload = saved.payload as unknown as SavedActivityPayload;

      return {
        success: true,
        statusCode: 201,
        data: {
          id: saved.id,
          activityId: Number(saved.externalActivityId),
          savedAt: saved.createdAt.toISOString(),
          activity,
          analysisData: savedPayload.analysisData,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all saved activities for a user, sorted by most recent
   */
  async getSavedActivities(userId: string): Promise<SavedActivityResponse[]> {
    const prismaClient = prisma as any;
    const activities = await prismaClient.userActivity.findMany({
      where: {
        userId,
        sourceType: 'STRAVA',
      },
      orderBy: { createdAt: 'desc' },
    });

    return activities.map((activity: any) => ({
      id: activity.id,
      activityId: Number(activity.externalActivityId),
      savedAt: activity.createdAt.toISOString(),
      activity:
        this.getActivityFromPayload(activity.payload as unknown) ||
        ({
          id: Number(activity.externalActivityId),
          name: '',
          type: '',
          distance: 0,
          moving_time: 0,
          elapsed_time: 0,
          total_elevation_gain: 0,
          average_speed: 0,
          max_speed: 0,
          start_date: new Date(0).toISOString(),
        } as StravaActivityPayload),
      analysisData: (activity.payload as unknown as SavedActivityPayload).analysisData,
    }));
  }

  /**
   * Delete a saved activity for a user
   * Returns true if deleted, false if not found
   */
  async deleteActivity(
    userId: string,
    activityId: number
  ): Promise<{ success: boolean; statusCode: number }> {
    const prismaClient = prisma as any;
    const deleted = await prismaClient.userActivity.deleteMany({
      where: {
        userId,
        sourceType: 'STRAVA',
        externalActivityId: BigInt(activityId),
      },
    });

    if (deleted.count === 0) {
      return {
        success: false,
        statusCode: 404,
      };
    }

    return {
      success: true,
      statusCode: 204,
    };
  }
}

export const savedActivityService = new SavedActivityService();
