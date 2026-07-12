import { Router } from "express";
import { createExpense, getExpenses } from "../controllers/expense.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", authenticate, authorize("FINANCIAL_ANALYST", "ADMIN"), createExpense);
router.get("/", authenticate, getExpenses);

export default router;
