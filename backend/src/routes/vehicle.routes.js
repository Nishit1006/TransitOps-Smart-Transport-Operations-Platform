import { Router } from "express";
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getOperationalCost,
} from "../controllers/vehicle.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.get("/", authenticate, authorize(...PERMISSIONS.vehicles), getVehicles);
router.post("/", authenticate, authorize(...PERMISSIONS.manageVehicles), createVehicle);
router.get("/:id/operational-cost", authenticate, getOperationalCost);
router.get("/:id", authenticate, authorize(...PERMISSIONS.vehicles), getVehicleById);
router.put("/:id", authenticate, authorize(...PERMISSIONS.manageVehicles), updateVehicle);
router.delete("/:id", authenticate, authorize(...PERMISSIONS.manageVehicles), deleteVehicle);

export default router;
