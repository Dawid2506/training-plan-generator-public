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
      session.title || `Rozmowa z ${session.createdAt.toLocaleDateString()}`,
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
      title: `Rozmowa z ${new Date().toLocaleDateString()}`,
    },
  });
};

export const createSession = async (userId: string, title?: string) => {
  return await prisma.chatSession.create({
    data: {
      userId,
      title: title || `Rozmowa z ${new Date().toLocaleDateString()}`,
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
