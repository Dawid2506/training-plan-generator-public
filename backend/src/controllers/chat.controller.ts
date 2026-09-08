import { Request, Response } from "express";
import * as chatService from "../services/chat.service";
import { ZodError } from "zod";
import { runCoachTurn } from "../services/coach/coach.service";
import { COACH } from "../services/coach/config";
import { sendMessageSchema } from "../utils/coach.validation";
import { incrementMessageUsage } from "../middleware/role-auth";
import { getString, getInteger } from "../utils/request";

export const getLatestSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const session = await chatService.getOrCreateSession(userId);
    const messages = await chatService.getSessionMessages(session.id);

    res.status(200).json({
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      messages,
    });
  } catch (error) {
    console.error("Error getting latest session:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const limit = getInteger(req.query.limit) || 10;
    const sessions = await chatService.getUserSessions(userId, limit);

    res.status(200).json({ sessions });
  } catch (error) {
    console.error("Error getting user sessions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { title } = req.body;
    const session = await chatService.createSession(userId, title);

    res.status(201).json({ session });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSessionMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getString(req.params.id);
    const userId = req.user?.id;

    if (!id) {
      res.status(400).json({ message: "Invalid session ID" });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const session = await chatService.getSessionById(id, userId);
    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    const messages = await chatService.getSessionMessages(id);
    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error getting session messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sessionId = getString(req.params.id);
    const userId = req.user?.id;

    if (!sessionId) {
      res.status(400).json({ message: "Invalid session ID" });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Validate before touching the database. The previous `content?.trim()`
    // threw a TypeError on a non-string body and surfaced as a 500.
    const { content } = sendMessageSchema.parse(req.body);

    const session = await chatService.getSessionById(sessionId, userId);
    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    // Read the transcript before writing this turn into it, or the question
    // would appear both as history and as the current user message.
    const history = await chatService.getRecentMessages(
      sessionId,
      COACH.maxHistoryMessages
    );

    const userMessage = await chatService.createMessage({
      sessionId,
      userId,
      content,
      isAnswer: false,
    });

    // Create the assistant row up front so its id can be attached to every
    // TokenUsage record the turn produces. Calling the model first is why
    // TokenUsage.messageId used to be null for every chat message.
    const pending = await chatService.createMessage({
      sessionId,
      userId,
      content: "",
      isAnswer: true,
      status: "SENDING",
    });

    let aiResponse;
    let toolsUsed: string[] = [];

    try {
      const turn = await runCoachTurn({
        userId,
        sessionId,
        messageId: pending.id,
        content,
        history,
      });

      toolsUsed = turn.toolsUsed;
      aiResponse = await chatService.updateMessage(pending.id, {
        content:
          turn.content ||
          "I could not put an answer together for that. Try asking a narrower question.",
        status: "SENT",
      });
    } catch (error) {
      console.error("Coach turn failed:", error);
      aiResponse = await chatService.updateMessage(pending.id, {
        content:
          "Sorry, there was an error generating a response. Please try again.",
        status: "ERROR",
      });
    }

    await incrementMessageUsage(userId);

    res.status(201).json({
      userMessage,
      aiResponse,
      toolsUsed,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: error.issues[0]?.message ?? "Invalid message",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
