import { Prisma, PrismaClient } from "@prisma/client";
import { IntervalPlan } from "../types/workout.types";

const prisma = new PrismaClient();

export class TrainingPlanService {
  static async saveGeneratedPlan(params: {
    userId: string;
    plan: IntervalPlan;
  }) {
    return prisma.trainingPlan.create({
      data: {
        userId: params.userId,
        plan: params.plan as unknown as Prisma.InputJsonValue,
      },
    });
  }

  static async getUserPlans(params: {
    userId: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const where = {
      userId: params.userId,
    };

    const [items, total] = await Promise.all([
      prisma.trainingPlan.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.trainingPlan.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async getPlanById(id: string) {
    return prisma.trainingPlan.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        userId: true,
        plan: true,
        createdAt: true,
      }
    });
  }

  /**
   * Ownership is part of the lookup, not a check the caller has to remember.
   *
   * getPlanById returns the userId but nothing forces a caller to compare it,
   * and a caller that forgets hands out another athlete's plan to anyone who
   * knows the uuid. Prefer this everywhere; the AI coach reads plans through it
   * so that no prompt can talk its way into a cross-account read.
   */
  static async getPlanByIdForUser(id: string, userId: string) {
    return prisma.trainingPlan.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        userId: true,
        plan: true,
        createdAt: true,
      }
    });
  }
}
