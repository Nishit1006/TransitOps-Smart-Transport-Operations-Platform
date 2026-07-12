import { z } from "zod";

const TRIP_STATUSES = ["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"];

export const createTripSchema = z.object({
  source: z.string().trim().min(1, "Source is required"),
  destination: z.string().trim().min(1, "Destination is required"),
  vehicleId: z.string().trim().min(1, "vehicleId is required"),
  driverId: z.string().trim().min(1, "driverId is required"),
  cargoWeightKg: z.coerce.number().positive("Cargo weight must be greater than 0"),
  plannedDistanceKm: z.coerce.number().positive("Planned distance must be greater than 0"),
});

// endOdometerKm/fuelConsumedLiters are explicitly called out in the spec.
// fuelCost and revenue aren't, but FuelLog.cost is a required (non-nullable)
// column and Trip.revenue is what the existing analytics ROI calc reads —
// both are optional here so completion still works if omitted (cost/revenue
// default to 0/unset), but a live demo wanting a real ROI number needs them.
export const completeTripSchema = z.object({
  endOdometerKm: z.coerce.number().min(0, "End odometer must be >= 0"),
  fuelConsumedLiters: z.coerce.number().min(0, "Fuel consumed must be >= 0"),
  fuelCost: z.coerce.number().min(0, "Fuel cost must be >= 0").optional(),
  revenue: z.coerce.number().min(0, "Revenue must be >= 0").optional(),
});

export const tripQuerySchema = z.object({
  status: z.enum(TRIP_STATUSES).optional(),
  vehicleId: z.string().trim().min(1).optional(),
  driverId: z.string().trim().min(1).optional(),
});
