import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { UserRole, getRolePermissions } from "../utils/role-permissions";
import { getString } from "../utils/request";

const prisma = new PrismaClient();

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;

    const where: any = {};

    if (role && typeof role === "string") {
      where.role = role.toUpperCase();
    }

    if (search && typeof search === "string") {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        messagesUsed: true,
        limitResetDate: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            chatSessions: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.user.count({ where });

    const usersWithPermissions = users.map((user: { role: UserRole }) => ({
      ...user,
      permissions: getRolePermissions(user.role as UserRole),
    }));

    res.status(200).json({
      users: usersWithPermissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changeUserRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getString(req.params.id);
    const { role } = req.body;

    if (!id) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({
        message: "Invalid role",
        validRoles: Object.values(UserRole),
      });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!targetUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (
      targetUser.role === UserRole.SUPER_ADMIN &&
      req.user?.role !== UserRole.SUPER_ADMIN
    ) {
      res.status(403).json({ message: "Cannot modify super admin user" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
        messagesUsed: 0,
        limitResetDate: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        messagesUsed: true,
        limitResetDate: true,
      },
    });

    res.status(200).json({
      user: updatedUser,
      permissions: getRolePermissions(updatedUser.role as UserRole),
    });
  } catch (error) {
    console.error("Error changing user role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAdminStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalSessions,
      totalMessages,
      usersByRole,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.chatSession.count(),
      prisma.message.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
      prisma.message.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          isAnswer: true,
          createdAt: true,
          user: {
            select: { username: true, role: true },
          },
        },
      }),
    ]);

    const roleStats = usersByRole.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item.role] = item._count.role;
        return acc;
      },
      {}
    );

    res.status(200).json({
      totalUsers,
      totalSessions,
      totalMessages,
      usersByRole: roleStats,
      recentActivity,
    });
  } catch (error) {
    console.error("Error getting admin stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
