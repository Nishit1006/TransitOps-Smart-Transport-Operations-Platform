import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { adminCreateUserSchema, adminUpdateUserSchema } from "../validators/admin.validator.js";

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

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
export const getUsers = asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(new ApiResponse(200, users, "Users retrieved successfully"));
});

// ─── PATCH /api/admin/users/:id ────────────────────────────────────────────────
export const updateUser = asyncHandler(async (req, res) => {
  const parsed = adminUpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { id } = req.params;
  const { role, isActive } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found");

  // Guard against an admin locking themselves out — the only way to grant
  // ADMIN is this same endpoint, so if the last admin demotes/deactivates
  // themselves there's no way back in without direct DB access.
  if (id === req.user.id) {
    if (role && role !== "ADMIN") {
      throw new ApiError(400, "You cannot remove your own ADMIN role.");
    }
    if (isActive === false) {
      throw new ApiError(400, "You cannot deactivate your own account.");
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined && { role }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.json(new ApiResponse(200, sanitizeUser(updated), "User updated successfully"));
});
