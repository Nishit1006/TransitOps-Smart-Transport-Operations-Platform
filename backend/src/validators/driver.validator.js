import { z } from "zod";

const LICENSE_CATEGORIES = ["LMV", "HMV", "MOTORCYCLE", "COMMERCIAL", "OTHER"];
const DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"];

export const createDriverSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  licenseNumber: z.string().trim().min(1, "License number is required"),
  licenseCategory: z.enum(LICENSE_CATEGORIES, { message: "Invalid license category" }),
  licenseExpiryDate: z.coerce.date({ message: "Invalid license expiry date" }),
  contactNumber: z.string().trim().min(1, "Contact number is required"),
  safetyScore: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(DRIVER_STATUSES).optional(),
});

export const updateDriverSchema = createDriverSchema.partial();

export const driverQuerySchema = z.object({
  status: z.enum(DRIVER_STATUSES).optional(),
  licenseCategory: z.enum(LICENSE_CATEGORIES).optional(),
  list: z.enum(["true", "false"]).optional(),
});
