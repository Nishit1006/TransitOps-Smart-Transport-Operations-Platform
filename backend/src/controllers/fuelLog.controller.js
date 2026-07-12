import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createFuelLogSchema, fuelLogQuerySchema } from "../validators/fuelLog.validator.js";

// ─── POST /api/fuel-logs ─────────────────────────────────────────────────────
export const createFuelLog = asyncHandler(async (req, res) => {
  const parsed = createFuelLogSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { vehicleId, tripId, liters, cost, date } = parsed.data;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new ApiError(404, "Trip not found");
  }

  const fuelLog = await prisma.fuelLog.create({
    data: { vehicleId, tripId: tripId ?? null, liters, cost, ...(date && { date }) },
  });

  res.status(201).json(new ApiResponse(201, fuelLog, "Fuel log created successfully"));
});

// ─── GET /api/fuel-logs ──────────────────────────────────────────────────────
export const getFuelLogs = asyncHandler(async (req, res) => {
  const parsed = fuelLogQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { vehicleId, tripId, startDate, endDate } = parsed.data;

  const where = {
    ...(vehicleId && { vehicleId }),
    ...(tripId && { tripId }),
    ...((startDate || endDate) && {
      date: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    }),
  };

  const fuelLogs = await prisma.fuelLog.findMany({ where, orderBy: { date: "desc" } });
  res.json(new ApiResponse(200, fuelLogs, "Fuel logs retrieved successfully"));
});
