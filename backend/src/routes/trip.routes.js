import { Router } from "express";
import {
  createTrip,
  getTrips,
  getTripById,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from "../controllers/trip.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.get("/", authenticate, authorize(...PERMISSIONS.trips), getTrips);
router.post("/", authenticate, authorize(...PERMISSIONS.manageTrips), createTrip);
router.get("/:id", authenticate, authorize(...PERMISSIONS.trips), getTripById);
router.post("/:id/dispatch", authenticate, authorize(...PERMISSIONS.manageTrips), dispatchTrip);
router.post("/:id/complete", authenticate, authorize(...PERMISSIONS.manageTrips), completeTrip);
router.post("/:id/cancel", authenticate, authorize(...PERMISSIONS.manageTrips), cancelTrip);

export default router;
