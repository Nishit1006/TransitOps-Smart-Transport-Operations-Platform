import { Router } from "express";
import {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} from "../controllers/driver.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.get("/", authenticate, authorize(...PERMISSIONS.drivers), getDrivers);
router.post("/", authenticate, authorize(...PERMISSIONS.manageDrivers), createDriver);
router.get("/:id", authenticate, authorize(...PERMISSIONS.drivers), getDriverById);
router.put("/:id", authenticate, authorize(...PERMISSIONS.manageDrivers), updateDriver);
router.delete("/:id", authenticate, authorize(...PERMISSIONS.manageDrivers), deleteDriver);

export default router;
