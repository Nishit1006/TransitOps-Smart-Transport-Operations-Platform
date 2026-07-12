import { Router } from "express";
import { createUser } from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.post("/users", authenticate, authorize(...PERMISSIONS.manageUsers), createUser);

export default router;
