import { Router } from "express";
import { createFuelLog, getFuelLogs } from "../controllers/fuelLog.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.post("/", authenticate, authorize(...PERMISSIONS.manageFuelExpenses), createFuelLog);
router.get("/", authenticate, getFuelLogs);

export default router;
