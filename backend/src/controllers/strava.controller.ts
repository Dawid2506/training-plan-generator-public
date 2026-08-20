import { Request, Response } from 'express';
import { StravaService } from '../services/strava.service';
import { createIntervalPlan } from "../services/openai.service";
import { getString, getInteger } from '../utils/request';
import { tokenStore } from '../utils/token-store';
import { WorkoutFocus } from '../types/workout.types';
import { TrainingPlanService } from '../services/trainingPlan.service';

const stravaService = new StravaService();

export const authorize = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authorized' });
      return;
    }
    const authUrl = stravaService.generateAuthUrl(userId);
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate the authorization URL' 
    });
  }
};

export const callback = async (req: Request, res: Response) => {
  const code = getString(req.query.code);
  const state = getString(req.query.state);

  if (!code || !state) {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?strava_error=authorization_failed`);
    return;
  }

  try {
    const tokens = await stravaService.exchangeCodeForToken(code);
    
    const userId = Buffer.from(state, 'base64').toString();
    tokenStore[userId] = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_at
    };

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?strava_success=true`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?strava_error=token_exchange_failed`);
  }
};

export const getLastActivity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authorized' });
      return;
    }
    const userTokens = tokenStore[userId];

    if (!userTokens) {
      res.status(401).json({
        success: false,
        error: 'Not authorized. Complete authorization via /api/strava/authorize first'
      });
      return;
    }

    if (Date.now() / 1000 > userTokens.expiresAt) {
      try {
        const newTokens = await stravaService.refreshAccessToken(userTokens.refreshToken);
        tokenStore[userId] = {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newTokens.expires_at
        };
      } catch (refreshError) {
        res.status(401).json({
          success: false,
          error: 'The token expired and could not be refreshed. Re-authorization is required.'
        });
        return;
      }
    }

    const lastActivity = await stravaService.getLastActivity(userTokens.accessToken);

    if (!lastActivity) {
      res.json({
        success: true,
        message: 'No activities found',
        data: null
      });
      return;
    }

    const formattedActivity = stravaService.formatActivity(lastActivity);

    res.json({
      success: true,
      data: formattedActivity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch the latest activity'
    });
  }
};

export const getActivityById = async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    const userId = req.user?.id;

    if (!id) {
      res.status(400).json({ success: false, error: "Invalid activity ID" });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Brak autoryzacji'
      });
      return;
    }

    const userTokens = tokenStore[userId];

    if (!userTokens) {
      res.status(401).json({
        success: false,
        error: 'Brak autoryzacji'
      });
      return;
    }

    if (Date.now() / 1000 > userTokens.expiresAt) {
      try {
        const newTokens = await stravaService.refreshAccessToken(userTokens.refreshToken);
        tokenStore[userId] = {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newTokens.expires_at
        };
      } catch (refreshError) {
        res.status(401).json({
          success: false,
          error: 'The token expired and could not be refreshed'
        });
        return;
      }
    }

    const activity = await stravaService.getActivityById(userTokens.accessToken, id);

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to fetch activity ${getString(req.params.id)}`
    });
  }
};

export const getActivities = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authorized' });
      return;
    }
    const userTokens = tokenStore[userId];

    if (!userTokens) {
      res.status(401).json({
        success: false,
        error: 'Brak autoryzacji'
      });
      return;
    }

    if (Date.now() / 1000 > userTokens.expiresAt) {
      try {
        const newTokens = await stravaService.refreshAccessToken(userTokens.refreshToken);
        tokenStore[userId] = {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newTokens.expires_at
        };
      } catch (refreshError) {
        res.status(401).json({
          success: false,
          error: 'The token expired and could not be refreshed'
        });
        return;
      }
    }

    const activities = await stravaService.getActivities(userTokens.accessToken, {
      per_page: getInteger(req.query.per_page),
      page: getInteger(req.query.page),
      before: getInteger(req.query.before),
      after: getInteger(req.query.after)
    });

    const formattedActivities = activities.map(activity => 
      stravaService.formatActivity(activity)
    );

    res.json({
      success: true,
      data: formattedActivities,
      count: formattedActivities.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch the activity list'
    });
  }
};

export const getAuthStatus = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.json({
      success: true,
      authorized: false,
      message: 'Not authenticated in application'
    });
    return;
  }
  const userTokens = tokenStore[userId];

  if (!userTokens) {
    res.json({
      success: true,
      authorized: false,
      message: 'Brak autoryzacji z Strava'
    });
    return;
  }

  const isExpired = Date.now() / 1000 > userTokens.expiresAt;

  res.json({
    success: true,
    authorized: true,
    tokenExpired: isExpired,
    expiresAt: new Date(userTokens.expiresAt * 1000).toISOString()
  });
};

export const getActivityDetailById = async (req: Request, res: Response) => {
  const id = getString(req.params.id);
  
  if (!id) {
    res.status(400).json({ success: false, error: "Invalid activity ID" });
    return;
  }

  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authorized' });
      return;
    }
    const userTokens = tokenStore[userId];

    if (!userTokens) {
      res.status(401).json({
        success: false,
        error: 'Not authorized'
      });
      return;
    }
    const analysisData = await stravaService.getActivityAnalysisData(id, userTokens.accessToken);
    res.json(analysisData);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Fetching activity error ${id}`
    });
  }
};

export const getLastActivitiesDetails = async (req: Request, res: Response) => {
  const count = getInteger(req.params.count);
  const type = getString(req.params.type);
  
  if (count === undefined || count <= 0 || count > 100) {
    res.status(400).json({ success: false, error: "Invalid count parameter" });
    return;
  }

  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authorized' });
      return;
    }
    const userTokens = tokenStore[userId];

    if (!userTokens) {
      res.status(401).json({
        success: false,
        error: 'Not authorized'
      });
      return;
    }
    const activities = await stravaService.getActivities(userTokens.accessToken, {
      count: count,
      type: type
    });
    const analysisData = await Promise.all(
      activities.map(activity => stravaService.getActivityAnalysisData(activity.id.toString(), userTokens.accessToken))
    );
    res.json(analysisData);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Fetching activity error ${error}`
    });
  }
};

export const getIntervalPlanForLastActivities = async (req: Request, res: Response) => {
  const count = getInteger(req.params.count);
  const type = getString(req.params.type);
  const workoutFocus = getString(req.params.focus) as WorkoutFocus;
  
  if (count === undefined || count <= 0 || count > 100) {
    res.status(400).json({ success: false, error: "Invalid count parameter" });
    return;
  }

  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authorized' });
      return;
    }

    const userTokens = tokenStore[userId];

    if (!userTokens) {
      res.status(401).json({
        success: false,
        error: 'Not authorized'
      });
      return;
    }
    const activities = await stravaService.getActivities(userTokens.accessToken, {
      count: count,
      type: type
    });
    const analysisData = await Promise.all(
      activities.map(activity => stravaService.getActivityAnalysisData(activity.id.toString(), userTokens.accessToken))
    );

    const payloadForPlan = {
      workoutFocus,
      analysisData,
    };

    const intervalPlan = await createIntervalPlan(JSON.stringify(payloadForPlan), userId);

    await TrainingPlanService.saveGeneratedPlan({
      userId,
      plan: intervalPlan,
    });

    res.json({
      success: true,
      data: intervalPlan
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Fetching activity error ${error}`
    });
  }
};

export const getIntervalPlanForCertainActivities = async (req: Request, res: Response) => {
  const workoutFocus = getString(req.params.focus) as WorkoutFocus;
  const rawActivityIds = req.body?.activityIds;

  if (!Array.isArray(rawActivityIds) || rawActivityIds.length === 0) {
    res.status(400).json({
      success: false,
      error: 'activityIds must be a non-empty array'
    });
    return;
  }

  if (rawActivityIds.length > 20) {
    res.status(400).json({
      success: false,
      error: 'Too many activity IDs. Maximum is 20'
    });
    return;
  }

  const activityIds = rawActivityIds
    .filter((value: unknown): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map((value: string | number) => String(value).trim())
    .filter((value: string) => value.length > 0);

  if (activityIds.length === 0) {
    res.status(400).json({
      success: false,
      error: 'activityIds contains no valid IDs'
    });
    return;
  }

  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authorized' });
      return;
    }

    const userTokens = tokenStore[userId];

    if (!userTokens) {
      res.status(401).json({
        success: false,
        error: 'Not authorized'
      });
      return;
    }

    if (Date.now() / 1000 > userTokens.expiresAt) {
      try {
        const newTokens = await stravaService.refreshAccessToken(userTokens.refreshToken);
        tokenStore[userId] = {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newTokens.expires_at
        };
      } catch (refreshError) {
        res.status(401).json({
          success: false,
          error: 'The token expired and could not be refreshed'
        });
        return;
      }
    }

    const uniqueActivityIds = [...new Set(activityIds)];
    const analysisData = await Promise.all(
      uniqueActivityIds.map((activityId) => stravaService.getActivityAnalysisData(activityId, tokenStore[userId].accessToken))
    );

    const payloadForPlan = {
      workoutFocus,
      analysisData,
    };

    const intervalPlan = await createIntervalPlan(JSON.stringify(payloadForPlan), userId);

    await TrainingPlanService.saveGeneratedPlan({
      userId,
      plan: intervalPlan,
    });

    res.json({
      success: true,
      data: intervalPlan
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Fetching activity error ${error}`
    });
  }
};

export const getIntervalPlans = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const page = getInteger(req.query.page);
    const limit = getInteger(req.query.limit);

    if (page !== undefined && page <= 0) {
      res.status(400).json({ success: false, error: "Invalid page parameter" });
      return;
    }

    if (limit !== undefined && (limit <= 0 || limit > 100)) {
      res.status(400).json({ success: false, error: "Invalid limit parameter" });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const plans = await TrainingPlanService.getUserPlans({
      userId,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Error getting user plans:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const getIntervalPlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const planId = getString(req.params.id);

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    if (!planId) {
      res.status(400).json({ success: false, error: "Invalid plan ID" });
      return;
    }

    const plan = await TrainingPlanService.getPlanById(planId);

    if (!plan) {
      res.status(404).json({ success: false, error: "Plan not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Error getting interval plan:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};