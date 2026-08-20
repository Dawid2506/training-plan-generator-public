import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole } from "../utils/role-permissions";

const prisma = new PrismaClient();

interface RegisterParams {
  username: string;
  email: string;
  password: string;
}

export const register = async ({
  username,
  email,
  password,
}: RegisterParams) => {
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUserByEmail) {
    return {
      status: 409,
      data: { message: "User with this email already exists" },
    };
  }

  const existingUserByUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUserByUsername) {
    return {
      status: 409,
      data: { message: "User with this username already exists" },
    };
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, password: hashed, role: UserRole.USER },
  });
  return {
    status: 201,
    data: { id: user.id, username: user.username },
  };
};

export const login = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { status: 401, data: { message: "Invalid credentials" } };
  }
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });
  return {
    status: 200,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
  };
};

export async function clearDatabase() {
  await prisma.user.deleteMany({});
  return {
    status: 200,
    data: { message: "Database cleared successfully" },
  };
}

export const getUserData = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};