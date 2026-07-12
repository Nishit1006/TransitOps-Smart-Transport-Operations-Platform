import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.get("/", authenticate, authorize(...PERMISSIONS.settings), getSettings);
router.put("/", authenticate, authorize(...PERMISSIONS.settings), updateSettings);

export default router;
