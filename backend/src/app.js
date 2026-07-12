import express from "express";
import cors from "cors";
import prisma from "./config/prisma.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  })
);
app.use(express.json());

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

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error" });
});

export default app;
