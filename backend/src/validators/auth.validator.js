import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(
    ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST", "ADMIN"],
    { message: "Invalid role" }
  ),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
