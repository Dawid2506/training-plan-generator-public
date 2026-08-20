import { Request, Response, NextFunction } from "express";
import {
  UserRole,
  hasRoleOrHigher,
  getRolePermissions,
  isUnlimitedRole,
} from "../utils/role-permissions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const requireRole = (requiredRole: UserRole) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, username: true, role: true },
      });

      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      if (!hasRoleOrHigher(user.role as UserRole, requiredRole)) {
        res.status(403).json({
          message: "Insufficient permissions",
          required: requiredRole,
          current: user.role,
        });
        return;
      }

      req.user = {
        ...req.user,
        role: user.role as UserRole,
        username: user.username,
      };
      next();
    } catch (error) {
      console.error("Role authorization error:", error);
      res.status(500).json({ message: "Authorization failed" });
      return;
    }
  };
};

export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);
export const requirePremium = requireRole(UserRole.PREMIUM);

export const checkMessageLimits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, messagesUsed: true, limitResetDate: true },
    });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const userRole = user.role as UserRole;

    if (isUnlimitedRole(userRole)) {
      next();
      return;
    }

    const permissions = getRolePermissions(userRole);

    const now = new Date();
    const resetDate = new Date(user.limitResetDate);
    const shouldReset =
      now.getMonth() !== resetDate.getMonth() ||
      now.getFullYear() !== resetDate.getFullYear();

    if (shouldReset) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          messagesUsed: 0,
          limitResetDate: now,
        },
      });
      next();
      return;
    }

    if (user.messagesUsed >= permissions.monthlyMessageLimit) {
      res.status(429).json({
        message: "Monthly message limit exceeded",
        limit: permissions.monthlyMessageLimit,
        used: user.messagesUsed,
        resetDate: user.limitResetDate,
        upgradeRequired:
          userRole === UserRole.USER ? UserRole.PREMIUM : UserRole.ADMIN,
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Message limit check error:", error);
    res.status(500).json({ message: "Limit check failed" });
    return;
  }
};

export const incrementMessageUsage = async (userId: string): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        messagesUsed: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("Failed to increment message usage:", error);
  }
};
