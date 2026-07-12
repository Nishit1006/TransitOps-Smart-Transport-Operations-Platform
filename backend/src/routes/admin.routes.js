import { Router } from "express";
import { createUser } from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/users", authenticate, authorize("ADMIN"), createUser);

export default router;
