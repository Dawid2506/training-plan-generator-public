import { Router } from "express";
import * as chatController from "../controllers/chat.controller";
import { authenticateToken } from "../middleware/auth";
import { checkMessageLimits, requireAdmin } from "../middleware/role-auth";
import {
  coachBurstLimit,
  coachConcurrencyGuard,
  coachDailyTokenCeiling,
} from "../middleware/coach-rate-limit";

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get("/sessions/latest", chatController.getLatestSession);

router.get("/sessions", chatController.getUserSessions);

router.post("/sessions", chatController.createSession);

router.get("/sessions/:id/messages", chatController.getSessionMessages);

// Ordered cheapest-first: reject a duplicate or a burst before spending a
// database round trip on the token ceiling, and all of it before the model.
router.post(
  "/sessions/:id/messages",
  coachConcurrencyGuard,
  coachBurstLimit,
  coachDailyTokenCeiling,
  checkMessageLimits,
  chatController.sendMessage
);

export default router;
