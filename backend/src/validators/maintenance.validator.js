import { z } from "zod";

export const createMaintenanceLogSchema = z.object({
  vehicleId: z.string().trim().min(1, "vehicleId is required"),
  serviceType: z.string().trim().min(1, "Service type is required"),
  cost: z.coerce.number().min(0, "Cost must be >= 0"),
  serviceDate: z.coerce.date().optional(),
});

export const maintenanceQuerySchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  status: z.enum(["IN_SHOP", "COMPLETED"]).optional(),
});
