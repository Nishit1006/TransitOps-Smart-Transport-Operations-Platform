import { z } from "zod";

export const createFuelLogSchema = z.object({
  vehicleId: z.string().trim().min(1, "vehicleId is required"),
  tripId: z.string().trim().min(1).optional().nullable(),
  liters: z.coerce.number().positive("liters must be greater than 0"),
  cost: z.coerce.number().min(0, "cost must be >= 0"),
  date: z.coerce.date().optional(),
});

export const fuelLogQuerySchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  tripId: z.string().trim().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
