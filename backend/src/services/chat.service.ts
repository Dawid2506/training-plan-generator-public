import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getUserSessions = async (userId: string, limit = 10) => {
  const sessions = await prisma.chatSession.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { messages: true },
      },
      messages: {
        select: {
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return sessions.map((session: any) => ({
    id: session.id,
    title:
      session.title || `Chat from ${session.createdAt.toLocaleDateString("en-GB")}`,
    messageCount: session._count.messages,
    lastMessage: session.messages[0]?.content || null,
    lastMessageAt: session.messages[0]?.createdAt || session.createdAt,
    createdAt: session.createdAt,
  }));
};

export const getOrCreateSession = async (userId: string) => {
  const recentSession = await prisma.chatSession.findFirst({
    where: {
      userId,
      isActive: true,
      updatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h temu
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (recentSession) {
    return recentSession;
  }

  return await prisma.chatSession.create({
    data: {
      userId,
      title: `Chat from ${new Date().toLocaleDateString("en-GB")}`,
    },
  });
};

export const createSession = async (userId: string, title?: string) => {
  return await prisma.chatSession.create({
    data: {
      userId,
      title: title || `Chat from ${new Date().toLocaleDateString("en-GB")}`,
    },
  });
};

export const getSessionById = async (sessionId: string, userId: string) => {
  return await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      userId,
      isActive: true,
    },
  });
};

export const getSessionMessages = async (sessionId: string) => {
  return await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      isAnswer: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  });
};

interface CreateMessageData {
  sessionId: string;
  userId: string;
  content: string;
  isAnswer: boolean;
  /** SENDING for an assistant row created before the model has answered. */
  status?: "SENDING" | "SENT" | "ERROR";
}

export const createMessage = async (data: CreateMessageData) => {
  const message = await prisma.message.create({
    data,
    select: {
      id: true,
      content: true,
      isAnswer: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  await prisma.chatSession.update({
    where: { id: data.sessionId },
    data: { updatedAt: new Date() },
  });

  return message;
};

/**
 * The tail of a thread, oldest-first, for replay into the model's context.
 *
 * Bounded on purpose: the coach also carries a training briefing, and an
 * unbounded transcript would push the data it needs out of the window.
 */
export const getRecentMessages = async (sessionId: string, limit: number) => {
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      content: true,
      isAnswer: true,
    },
  });

  return messages.reverse();
};

/**
 * Fill in an assistant message that was created before the model ran.
 *
 * The row has to exist first so its id can be attached to every TokenUsage
 * record the turn produces - previously the model was called before the message
 * was created, so messageId was always null and per-message cost was unknowable.
 */
export const updateMessage = async (
  messageId: string,
  data: { content: string; status: "SENT" | "ERROR" }
) => {
  return prisma.message.update({
    where: { id: messageId },
    data,
    select: {
      id: true,
      content: true,
      isAnswer: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  });
};
