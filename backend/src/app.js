import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "./config/prisma.js";
import errorHandler from "./middlewares/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import fuelLogRoutes from "./routes/fuelLog.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";
import driverRoutes from "./routes/driver.routes.js";
import tripRoutes from "./routes/trip.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import reportRoutes from "./routes/report.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import settingsRoutes from "./routes/settings.routes.js";

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
app.use("/api/fuel-logs", fuelLogRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);
export default app;

