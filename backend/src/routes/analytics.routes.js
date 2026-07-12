import { Router } from "express";
import {
  getAnalyticsSummary,
  getMonthlyRevenue,
  getTopCostliestVehicles,
} from "../controllers/analytics.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/summary", authenticate, getAnalyticsSummary);
router.get("/monthly-revenue", authenticate, getMonthlyRevenue);
router.get("/top-costliest-vehicles", authenticate, getTopCostliestVehicles);

export default router;
