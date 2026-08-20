import { Router } from 'express';
import { savedActivityController } from '../controllers/saved-activity.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/strava/saved-activities
 * Save a Strava activity
 */
router.post('/', (req, res) => savedActivityController.saveActivity(req, res));

/**
 * GET /api/strava/saved-activities
 * List all saved activities for the user
 */
router.get('/', (req, res) => savedActivityController.listActivities(req, res));

/**
 * DELETE /api/strava/saved-activities/:activityId
 * Delete a saved activity
 */
router.delete('/:activityId', (req, res) => savedActivityController.deleteActivity(req, res));

export default router;
