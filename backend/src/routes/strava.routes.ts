import { Router } from 'express';
import { authorize, callback, getAuthStatus, getLastActivity, getActivityById, getActivities, getActivityDetailById, getLastActivitiesDetails, getIntervalPlanForLastActivities, getIntervalPlanForCertainActivities, getIntervalPlans, getIntervalPlan } from '../controllers/strava.controller';
import { authenticateToken } from '../middleware/auth';
import savedActivityRoutes from './saved-activity.routes';

const router = Router();

router.get('/callback', callback);

router.use(authenticateToken);

router.get('/authorize', authorize);

router.get('/auth-status', getAuthStatus);

router.get('/status', getAuthStatus);

router.get('/last-activity', getLastActivity);

router.get('/activity/:id', getActivityById);

router.get('/activities', getActivities);

router.get('/activity/details/:id', getActivityDetailById);

router.get('/last-activities/details/:type/:count', getLastActivitiesDetails);

router.post('/last-activities/details/:focus/:type/:count/create-plan', getIntervalPlanForLastActivities);

router.post('/certain-activities/details/:focus/create-plan', getIntervalPlanForCertainActivities);

router.get('/user-interval-plans', getIntervalPlans);

router.get('/user-interval-plan/:id', getIntervalPlan);

// Saved activities routes
router.use('/saved-activities', savedActivityRoutes);

export default router;
