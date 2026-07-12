import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generateOtp, getOtpExpiry, OTP_VALIDITY_MINUTES } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/mailer.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from "../validators/auth.validator.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const BCRYPT_SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Self-serve registration always gets this role. Never trust a role value
// supplied by the client — elevated roles are only granted via
// POST /api/admin/users, which requires an authenticated ADMIN.
const SELF_SERVE_ROLE = "DISPATCHER";

/** Strip passwordHash from user object before sending to client */
const sanitizeUser = (user) => {
  const { passwordHash, failedLoginAttempts, lockedUntil, otpCode, otpExpiresAt, ...safe } = user;
  return safe;
};

/** Generate a JWT and set it as an httpOnly cookie on the response */
const setTokenCookie = (res, user) => {
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
};

// ─── POST /api/auth/register ─────────────────────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { name, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, "A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const otp = generateOtp();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: SELF_SERVE_ROLE,
      otpCode: otp,
      otpExpiresAt: getOtpExpiry(),
    },
  });

  await sendOtpEmail(email, otp, OTP_VALIDITY_MINUTES);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { email: user.email },
        "Account created. Enter the OTP sent to your email to verify."
      )
    );
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(401, "Account is deactivated. Contact an administrator.");
  }

  // ── Lockout check ──
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new ApiError(
      423,
      `Account is locked due to too many failed login attempts. Try again in ${remainingMin} minute(s).`
    );
  }

  // ── Password verification ──
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const newFailedAttempts = user.failedLoginAttempts + 1;
    const updateData = { failedLoginAttempts: newFailedAttempts };

    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      updateData.failedLoginAttempts = 0; // Reset counter after locking
    }

    await prisma.user.update({ where: { id: user.id }, data: updateData });

    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      throw new ApiError(
        423,
        `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes due to ${MAX_FAILED_ATTEMPTS} failed login attempts.`
      );
    }

    throw new ApiError(
      401,
      `Invalid email or password. ${MAX_FAILED_ATTEMPTS - newFailedAttempts} attempt(s) remaining before lockout.`
    );
  }

  // ── Success — reset failed attempts ──
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Email not verified. Please verify the OTP sent to your email.");
  }

  setTokenCookie(res, user);

  res.json(new ApiResponse(200, sanitizeUser(user), "Login successful"));
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
export const verifyOtp = asyncHandler(async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { email, otp } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(404, "No account found with this email");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  if (user.otpCode !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, otpCode: null, otpExpiresAt: null },
  });

  setTokenCookie(res, verifiedUser);

  res.json(new ApiResponse(200, sanitizeUser(verifiedUser), "Email verified successfully"));
});

// ─── POST /api/auth/resend-otp ───────────────────────────────────────────────
export const resendOtp = asyncHandler(async (req, res) => {
  const parsed = resendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(404, "No account found with this email");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  const otp = generateOtp();
  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: otp, otpExpiresAt: getOtpExpiry() },
  });

  await sendOtpEmail(email, otp, OTP_VALIDITY_MINUTES);

  res.json(new ApiResponse(200, null, "A new OTP has been sent to your email."));
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
export const me = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, req.user, "Current user retrieved"));
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.json(new ApiResponse(200, null, "Logged out successfully"));
});
