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

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/strava", stravaRoutes);

app.get("/", (req, res) => {
  res.send(`Server running on port ${process.env.PORT || 3000}`);
});

export default app;
