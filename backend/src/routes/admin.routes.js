import { Router } from "express";
import { createUser, getUsers, updateUser } from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.get("/users", authenticate, authorize(...PERMISSIONS.manageUsers), getUsers);
router.post("/users", authenticate, authorize(...PERMISSIONS.manageUsers), createUser);
router.patch("/users/:id", authenticate, authorize(...PERMISSIONS.manageUsers), updateUser);

export default router;
