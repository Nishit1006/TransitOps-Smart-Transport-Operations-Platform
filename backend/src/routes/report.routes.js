import { Router } from "express";
import { exportCsv } from "../controllers/report.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/export/csv", authenticate, exportCsv);

export default router;
