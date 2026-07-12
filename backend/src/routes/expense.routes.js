import { Router } from "express";
import { createExpense, getExpenses } from "../controllers/expense.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.post("/", authenticate, authorize(...PERMISSIONS.manageFuelExpenses), createExpense);
router.get("/", authenticate, getExpenses);

export default router;
