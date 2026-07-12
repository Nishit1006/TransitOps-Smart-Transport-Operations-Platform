import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { adminCreateUserSchema } from "../validators/admin.validator.js";

const BCRYPT_SALT_ROUNDS = 10;

const sanitizeUser = (user) => {
  const { passwordHash, failedLoginAttempts, lockedUntil, otpCode, otpExpiresAt, ...safe } = user;
  return safe;
};

// ─── POST /api/admin/users ────────────────────────────────────────────────────
// ADMIN-only. This is the only way to create a user with an elevated role —
// the public /api/auth/register endpoint always hardcodes the lowest privilege.
export const createUser = asyncHandler(async (req, res) => {
  const parsed = adminCreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { name, email, password, role } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, "A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // An admin creating an account directly is itself the verification step —
  // no OTP round-trip needed, unlike self-serve registration.
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, isEmailVerified: true },
  });

  res.status(201).json(new ApiResponse(201, sanitizeUser(user), "User created successfully"));
});
