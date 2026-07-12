import { z } from "zod";

const ROLES = ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST", "ADMIN"];

export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLES, { message: "Invalid role" }),
});

export const adminUpdateUserSchema = z
  .object({
    role: z.enum(ROLES, { message: "Invalid role" }).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: "At least one of role or isActive must be provided",
  });
