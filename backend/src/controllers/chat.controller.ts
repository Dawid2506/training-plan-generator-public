import { Request, Response } from "express";
import * as chatService from "../services/chat.service";
import { generateAIResponse } from "../services/openai.service";
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
    const { content } = req.body;
    const userId = req.user?.id;

    if (!sessionId) {
      res.status(400).json({ message: "Invalid session ID" });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!content?.trim()) {
      res.status(400).json({ message: "Message content is required" });
      return;
    }

    if (content.trim().length > 100) {
      res
        .status(400)
        .json({ message: "Message too long (max 100 characters)" });
      return;
    }

    const session = await chatService.getSessionById(sessionId, userId);
    if (!session) {
      res.status(404).json({ message: "Session not found" });
      return;
    }

    const userMessage = await chatService.createMessage({
      sessionId,
      userId,
      content: content.trim(),
      isAnswer: false,
    });

    let aiResponseContent: string;
    try {
      aiResponseContent = await generateAIResponse(
        content.trim(),
        userId,
        sessionId
      );
    } catch (error) {
      console.error("AI generation failed:", error);
      aiResponseContent =
        "Sorry, there was an error generating a response. Please try again.";
    }

    const aiResponse = await chatService.createMessage({
      sessionId,
      userId,
      content: aiResponseContent,
      isAnswer: true,
    });

    await incrementMessageUsage(userId);

    res.status(201).json({
      userMessage,
      aiResponse,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
