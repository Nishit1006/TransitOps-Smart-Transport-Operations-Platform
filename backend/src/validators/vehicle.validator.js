import { z } from "zod";

const VEHICLE_TYPES = ["TRUCK", "VAN", "MINI", "TRAILER", "OTHER"];
const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

export const createVehicleSchema = z.object({
  registrationNumber: z.string().trim().min(1, "Registration number is required"),
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(VEHICLE_TYPES, { message: "Invalid vehicle type" }),
  maxLoadCapacityKg: z.coerce.number().positive("Max load capacity must be greater than 0"),
  odometerKm: z.coerce.number().min(0, "Odometer must be >= 0").optional(),
  acquisitionCost: z.coerce.number().min(0, "Acquisition cost must be >= 0"),
  status: z.enum(VEHICLE_STATUSES).optional(),
  region: z.string().trim().min(1).optional().nullable(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const vehicleQuerySchema = z.object({
  type: z.enum(VEHICLE_TYPES).optional(),
  status: z.enum(VEHICLE_STATUSES).optional(),
  region: z.string().trim().min(1).optional(),
  list: z.enum(["true", "false"]).optional(),
});
