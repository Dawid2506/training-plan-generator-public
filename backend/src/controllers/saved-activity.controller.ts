import { Request, Response } from 'express';
import { savedActivityService } from '../services/saved-activity.service';
import { StravaService } from '../services/strava.service';
import { SaveActivityRequestSchema } from '../utils/saved-activity.validation';
import { tokenStore } from '../utils/token-store';
import {
  SaveActivityApiResponse,
  ListSavedActivitiesResponse,
  DeleteActivityResponse,
  ApiErrorResponse,
} from '../types/saved-activity.dto';
import { ZodError } from 'zod';

export class SavedActivityController {
  private stravaService: StravaService;

  constructor() {
    this.stravaService = new StravaService();
  }

  /**
   * POST /api/strava/saved-activities
   * Save a Strava activity for the authenticated user
   * Frontend sends only activityId, backend fetches full data from Strava
   */
  async saveActivity(req: Request, res: Response<SaveActivityApiResponse | ApiErrorResponse>): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized: User not authenticated' });
        return;
      }

      // Validate request body
      const validated = SaveActivityRequestSchema.parse(req.body);

      // Get user's Strava tokens
      const userTokens = tokenStore[userId];
      if (!userTokens) {
        res.status(401).json({
          message: 'Unauthorized: Strava not connected',
          code: 'STRAVA_NOT_CONNECTED',
        });
        return;
      }

      // Fetch full activity data from Strava
      const analysisData = await this.stravaService.getActivityAnalysisData(
        String(validated.activityId),
        userTokens.accessToken
      );

      if (!analysisData?.activity) {
        res.status(404).json({
          message: 'Activity not found on Strava',
          code: 'ACTIVITY_NOT_FOUND',
        });
        return;
      }

      // Save with the analysisData structure to match user activity payload shape
      const result = await savedActivityService.saveActivity(userId, analysisData);

      res.status(result.statusCode).json({
        success: result.success,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: 'Invalid request payload',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      console.error('SaveActivity error:', error);
      res.status(500).json({
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  /**
   * GET /api/strava/saved-activities
   * List all saved activities for the authenticated user
   */
  async listActivities(req: Request, res: Response<ListSavedActivitiesResponse | ApiErrorResponse>): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized: User not authenticated' });
        return;
      }

      const activities = await savedActivityService.getSavedActivities(userId);
      const displayActivities = activities.map(({ analysisData, ...activity }) => activity);

      res.status(200).json({
        data: displayActivities,
      });
    } catch (error) {
      console.error('ListActivities error:', error);
      res.status(500).json({
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  /**
   * DELETE /api/strava/saved-activities/:activityId
   * Delete a saved activity for the authenticated user
   */
  async deleteActivity(req: Request, res: Response<DeleteActivityResponse | ApiErrorResponse>): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized: User not authenticated' });
        return;
      }

      const activityId = Array.isArray(req.params.activityId)
        ? req.params.activityId[0]
        : req.params.activityId;

      // Validate activityId is numeric
      const parsedActivityId = parseInt(activityId, 10);
      if (isNaN(parsedActivityId) || parsedActivityId <= 0) {
        res.status(400).json({
          message: 'Invalid activity ID',
          code: 'INVALID_ACTIVITY_ID',
        });
        return;
      }

      const result = await savedActivityService.deleteActivity(userId, parsedActivityId);

      if (!result.success) {
        res.status(404).json({
          message: 'Activity not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('DeleteActivity error:', error);
      res.status(500).json({
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
}

export const savedActivityController = new SavedActivityController();
