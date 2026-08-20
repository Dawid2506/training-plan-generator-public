import { Request, Response } from "express";
import { getInteger } from "../utils/request";
import { TokenTrackingService } from "../services/tokenTracking.service";

export const getMyTokenUsage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const days = getInteger(req.query.days) || 30;
    const stats = await TokenTrackingService.getUserTokenStats(userId, days);

    res.json({
      period: `${days} days`,
      totalTokens: stats._sum.totalTokens || 0,
      totalMessages: stats._count.id || 0,
      avgTokensPerMessage:
        stats._count.id > 0
          ? (stats._sum.totalTokens || 0) / stats._count.id
          : 0,
    });
  } catch (error) {
    console.error("Error getting user token usage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyTokenUsageChart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const days = getInteger(req.query.days) || 30;
    const chartData = await TokenTrackingService.getUserTokenChartData(
      userId,
      days
    );

    res.json({
      period: `${days} days`,
      data: chartData,
    });
  } catch (error) {
    console.error("Error getting user token chart data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyTokenUsageChart24h = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const chartData = await TokenTrackingService.getUserTokenHourlyChart(
      userId
    );

    res.json({
      period: `Last 24 hours`,
      data: chartData,
    });
  } catch (error) {
    console.error("Error getting user token chart data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
