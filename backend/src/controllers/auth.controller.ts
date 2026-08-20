
import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { sendRegistrationEmail } from "../services/mail.service";

export const register = async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  if (result.status === 201 && req.body.email && req.body.username) {
    // try {
    //   console.log("Sending registration email to:", req.body.email);
    //   await sendRegistrationEmail(req.body.email, req.body.username);
    // } catch (err) {
    //   console.error("Mail sending error:", err);
    // }
  }
  res.status(result.status).json(result.data);
};

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  if (result.status === 200 && result.data.token) {
    res.cookie("token", result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 60 * 60 * 1000,
    });
    res.status(200).json({ user: result.data.user });
  } else {
    res.status(result.status).json(result.data);
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.status(200).json({ message: "Logged out successfully" });
};

export const clearDatabase = async (req: Request, res: Response) => {
  const result = await authService.clearDatabase();
  res.status(result.status).json(result.data);
};

export const getMe = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userData = await authService.getUserData(userId);

    res.json({
      user: userData,
    });
  } catch (error) {
    console.error("Error getting user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};