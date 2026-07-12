import { Router } from "express";
import { createFuelLog, getFuelLogs } from "../controllers/fuelLog.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", authenticate, authorize("FINANCIAL_ANALYST", "ADMIN"), createFuelLog);
router.get("/", authenticate, getFuelLogs);

export default router;
