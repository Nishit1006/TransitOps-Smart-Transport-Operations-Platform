import { Router } from "express";
import {
  createMaintenanceLog,
  closeMaintenanceLog,
  getMaintenanceLogs,
} from "../controllers/maintenance.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.get("/", authenticate, authorize(...PERMISSIONS.maintenance), getMaintenanceLogs);
router.post("/", authenticate, authorize(...PERMISSIONS.manageMaintenance), createMaintenanceLog);
router.post("/:id/close", authenticate, authorize(...PERMISSIONS.manageMaintenance), closeMaintenanceLog);

export default router;
