import { z } from "zod";

// `role` is deliberately not accepted here — self-serve registration always
// gets the lowest-privilege role. Elevated roles are created via
// POST /api/admin/users by an existing ADMIN.
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
});

export const resendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
});
