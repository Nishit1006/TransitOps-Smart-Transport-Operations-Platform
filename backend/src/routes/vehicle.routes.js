import { Router } from "express";
import { getOperationalCost } from "../controllers/vehicle.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/:id/operational-cost", authenticate, getOperationalCost);

export default router;
