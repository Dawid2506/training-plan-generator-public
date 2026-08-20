import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UserRole } from "./role-permissions";

const prisma = new PrismaClient();

export const createInitialSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (existingSuperAdmin) {
      console.log("SUPER_ADMIN already exists, skipping setup.");
      return;
    }

    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || "superadmin";

    if (!adminEmail || !adminPassword) {
      console.log(
        "No initial admin credentials provided in env vars, skipping setup."
      );
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      console.log("User with admin email already exists, skipping setup.");
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const superAdmin = await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
      },
    });

    console.log(
      `✅ Initial SUPER_ADMIN created: ${superAdmin.username} (${superAdmin.email})`
    );
  } catch (error) {
    console.error("❌ Failed to create initial SUPER_ADMIN:", error);
  }
};
