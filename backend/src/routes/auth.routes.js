import { Router } from "express";
import {
  register,
  login,
  me,
  logout,
  verifyOtp,
  resendOtp,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.get("/me", authenticate, me);
router.post("/logout", authenticate, logout);

export default router;
