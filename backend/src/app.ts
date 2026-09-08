import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import chatRoutes from "./routes/chat.routes";
import adminRoutes from "./routes/admin.routes";
import userRoutes from "./routes/user.routes";
import stravaRoutes from "./routes/strava.routes";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3000",
      "https://dt-standard-frontend.onrender.com",
    ],
    credentials: true,
  })
);

// Pinned rather than relying on the framework default. Chat messages are
// capped at a few kilobytes; nothing here needs a large body.
app.use(express.json({ limit: "256kb" }));
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/strava", stravaRoutes);

app.get("/", (req, res) => {
  res.send(`Server running on port ${process.env.PORT || 3000}`);
});

// Last resort. Without this an unhandled throw in an async handler under
// Express 5 becomes an unhandled rejection, and several controllers interpolate
// the caught error straight into the response body.
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", error);
    if (res.headersSent) {
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  }
);

export default app;
