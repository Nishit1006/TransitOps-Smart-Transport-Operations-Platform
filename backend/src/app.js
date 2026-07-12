import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "./config/prisma.js";
import errorHandler from "./middlewares/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({ name: "TransitOps API", status: "ok" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health/db", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch (err) {
    next(err);
  }
});

// ── API Routes ──
app.use("/api/auth", authRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);
export default app;

