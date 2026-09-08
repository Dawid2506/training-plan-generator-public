import { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma/client";
import { COACH } from "../services/coach/config";

/**
 * Cost controls for the coach endpoint.
 *
 * `checkMessageLimits` counts one unit per message, which was accurate when a
 * message meant one model call. A coach turn is now up to five model calls and
 * twelve tool executions, so the message counter alone no longer bounds
 * anything that matters.
 *
 * Three guards, deliberately different in kind:
 *  - concurrency, which stops the cheapest attack (open many tabs);
 *  - a burst window, which smooths a single impatient user;
 *  - a rolling token ceiling, the only one that survives a restart.
 */

/**
 * One coach turn per user at a time.
 *
 * This is the highest-value control here and the smallest: without it, twenty
 * parallel requests cost twenty times as much and the monthly counter only
 * catches up afterwards.
 */
const inFlight = new Set<string>();

export const coachConcurrencyGuard = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (inFlight.has(userId)) {
    res.status(409).json({
      message: "Still working on your previous question. One at a time.",
      code: "coach_busy",
    });
    return;
  }

  inFlight.add(userId);
  // Release on whichever comes first. 'close' covers the client hanging up
  // mid-turn, which 'finish' alone would miss and leak the slot forever.
  const release = (): void => {
    inFlight.delete(userId);
  };
  res.once("finish", release);
  res.once("close", release);

  next();
};

/**
 * A sliding window per user, held in memory.
 *
 * Note this is per process: with more than one instance behind a load balancer
 * each gets its own window, so the effective limit multiplies. Redis is the
 * correct home for this if the app is ever scaled out - the token ceiling below
 * is the guard that keeps working either way.
 */
const recentRequests = new Map<string, number[]>();

export const coachBurstLimit = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const now = Date.now();
  const cutoff = now - COACH.burstWindowMs;
  const timestamps = (recentRequests.get(userId) ?? []).filter(
    (stamp) => stamp > cutoff
  );

  if (timestamps.length >= COACH.burstLimit) {
    const retryAfterMs = timestamps[0] + COACH.burstWindowMs - now;
    res.status(429).json({
      message: "Too many questions in a short time. Give it a minute.",
      code: "coach_burst",
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    });
    return;
  }

  timestamps.push(now);
  recentRequests.set(userId, timestamps);

  // Keep the map from growing without bound in a long-lived process.
  if (recentRequests.size > 10_000) {
    for (const [key, stamps] of recentRequests) {
      if (stamps.every((stamp) => stamp <= cutoff)) {
        recentRequests.delete(key);
      }
    }
  }

  next();
};

/**
 * A rolling 24-hour token ceiling, read from TokenUsage.
 *
 * Unlike the two above this is database-backed, so it survives restarts and
 * holds across processes. The existing @@index([userId, createdAt]) covers it.
 */
export const coachDailyTokenCeiling = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const { _sum } = await prisma.tokenUsage.aggregate({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      _sum: { totalTokens: true },
    });

    if ((_sum.totalTokens ?? 0) > COACH.dailyTokenCeiling) {
      res.status(429).json({
        message: "Daily usage limit reached. Try again tomorrow.",
        code: "daily_token_ceiling",
      });
      return;
    }

    next();
  } catch (error) {
    // A failing ceiling check must not lock the athlete out of their coach.
    console.error("coach daily token ceiling check failed", error);
    next();
  }
};
