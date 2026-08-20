import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TokenUsageData {
  userId: string;
  sessionId?: string;
  messageId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}

export class TokenTrackingService {
  static async recordTokenUsage(data: TokenUsageData) {
    try {
      const tokenUsage = await prisma.tokenUsage.create({
        data: {
          userId: data.userId,
          sessionId: data.sessionId,
          messageId: data.messageId,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
          model: data.model,
        },
      });

      return tokenUsage;
    } catch (error) {
      console.error("Error recording token usage:", error);
      throw error;
    }
  }

  static async getUserTokenStats(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await prisma.tokenUsage.aggregate({
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
      },
      _count: {
        id: true,
      },
    });
  }

  static async getUserTokenChartData(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    try {
      const rawData = (await prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          SUM("totalTokens")::INTEGER as total_tokens,
          SUM("promptTokens")::INTEGER as prompt_tokens,
          SUM("completionTokens")::INTEGER as completion_tokens,
          COUNT(*)::INTEGER as message_count,
          AVG("totalTokens")::FLOAT as avg_tokens_per_message
        FROM "TokenUsage"
        WHERE "userId" = ${userId}
        AND "createdAt" >= ${since}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `) as any[];

      const chartData = [];
      const currentDate = new Date(since);
      const endDate = new Date();

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];

        const dayData = rawData.find(
          (item) => item.date.toISOString().split("T")[0] === dateStr
        );

        chartData.push({
          date: dateStr,
          totalTokens: dayData?.total_tokens || 0,
          promptTokens: dayData?.prompt_tokens || 0,
          completionTokens: dayData?.completion_tokens || 0,
          messageCount: dayData?.message_count || 0,
          avgTokensPerMessage: dayData?.avg_tokens_per_message || 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return chartData;
    } catch (error) {
      console.error("Error getting chart data:", error);
      throw error;
    }
  }

  static async getUserTokenHourlyChart(userId: string) {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    try {
      const rawData = (await prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM "createdAt")::INTEGER as hour,
          SUM("totalTokens")::INTEGER as total_tokens,
          COUNT(*)::INTEGER as message_count
        FROM "TokenUsage"
        WHERE "userId" = ${userId}
        AND "createdAt" >= ${since}
        GROUP BY EXTRACT(HOUR FROM "createdAt")
        ORDER BY hour ASC
      `) as any[];

      const chartData = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourData = rawData.find((item) => item.hour === hour);

        chartData.push({
          hour: `${hour.toString().padStart(2, "0")}:00`,
          totalTokens: hourData?.total_tokens || 0,
          messageCount: hourData?.message_count || 0,
        });
      }

      return chartData;
    } catch (error) {
      console.error("Error getting hourly chart data:", error);
      throw error;
    }
  }
}
