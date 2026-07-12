import { Router } from "express";
import {
  getKpis,
  getRecentTrips,
  getVehicleStatusBreakdown,
} from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/kpis", authenticate, getKpis);
router.get("/recent-trips", authenticate, getRecentTrips);
router.get("/vehicle-status-breakdown", authenticate, getVehicleStatusBreakdown);

export default router;
