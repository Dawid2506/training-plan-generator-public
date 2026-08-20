import { Router } from "express";
import * as chatController from "../controllers/chat.controller";
import { authenticateToken } from "../middleware/auth";
import { checkMessageLimits, requireAdmin } from "../middleware/role-auth";

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get("/sessions/latest", chatController.getLatestSession);

router.get("/sessions", chatController.getUserSessions);

router.post("/sessions", chatController.createSession);

router.get("/sessions/:id/messages", chatController.getSessionMessages);

router.post(
  "/sessions/:id/messages",
  checkMessageLimits,
  chatController.sendMessage
);

export default router;
