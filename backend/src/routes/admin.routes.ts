import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { authenticateToken } from "../middleware/auth";
import { requireAdmin, requireSuperAdmin } from "../middleware/role-auth";

const router = Router();

router.use(authenticateToken);

router.get("/stats", requireAdmin, adminController.getAdminStats);

router.get("/users", requireAdmin, adminController.getAllUsers);

router.put(
  "/users/:id/role",
  requireSuperAdmin,
  adminController.changeUserRole
);

export default router;
