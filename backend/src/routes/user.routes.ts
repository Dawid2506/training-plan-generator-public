import { Router } from "express";
import multer from "multer";
import {
  getMyTokenUsage,
  getMyTokenUsageChart,
  getMyTokenUsageChart24h,
} from "../controllers/tokenTracking.controller";
import {
  getAllUserActivities,
  getIntervalPlanForCertainFileActivities,
  getIntervalPlanForLastFileActivities,
  parseAndSaveUserActivityFile,
  parseUserActivityFile,
} from "../controllers/user.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.get("/analytics/my-usage", authenticateToken, getMyTokenUsage);
router.get(
  "/analytics/my-usage-chart",
  authenticateToken,
  getMyTokenUsageChart
);
router.get(
  "/analytics/my-usage-chart-24h",
  authenticateToken,
  getMyTokenUsageChart24h
);

router.post(
  "/activities/parse",
  authenticateToken,
  upload.single("file"),
  parseUserActivityFile
);

router.post(
  "/activities/save",
  authenticateToken,
  upload.single("file"),
  parseAndSaveUserActivityFile
);

router.get("/activities", authenticateToken, getAllUserActivities);

router.post(
  "/activities/certain-activities/:focus/create-plan",
  authenticateToken,
  getIntervalPlanForCertainFileActivities
);

router.post(
  "/activities/last-activities/:focus/:type/:count/create-plan",
  authenticateToken,
  getIntervalPlanForLastFileActivities
);

export default router;
