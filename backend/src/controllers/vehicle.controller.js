import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseOrThrow } from "../utils/validate.js";
import { createVehicleSchema, updateVehicleSchema, vehicleQuerySchema } from "../validators/vehicle.validator.js";

// ─── GET /api/vehicles ────────────────────────────────────────────────────────
export const getVehicles = asyncHandler(async (req, res) => {
  const { type, status, region, list } = parseOrThrow(vehicleQuerySchema, req.query);

  const where = {
    ...(type && { type }),
    ...(status && { status }),
    ...(region && { region }),
  };

  if (list === "true") {
    const vehicles = await prisma.vehicle.findMany({
      where,
      select: { id: true, name: true, registrationNumber: true, status: true },
      orderBy: { name: "asc" },
    });
    return res.json(new ApiResponse(200, vehicles, "Vehicle list retrieved successfully"));
  }

  const vehicles = await prisma.vehicle.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(new ApiResponse(200, vehicles, "Vehicles retrieved successfully"));
});

// ─── GET /api/vehicles/:id ─────────────────────────────────────────────────────
export const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  res.json(new ApiResponse(200, vehicle, "Vehicle retrieved successfully"));
});

// ─── POST /api/vehicles ────────────────────────────────────────────────────────
export const createVehicle = asyncHandler(async (req, res) => {
  const data = parseOrThrow(createVehicleSchema, req.body);

  const existing = await prisma.vehicle.findUnique({
    where: { registrationNumber: data.registrationNumber },
  });
  if (existing) throw new ApiError(409, "A vehicle with this registration number already exists");

  const vehicle = await prisma.vehicle.create({ data });
  res.status(201).json(new ApiResponse(201, vehicle, "Vehicle created successfully"));
});

// ─── PUT /api/vehicles/:id ──────────────────────────────────────────────────────
export const updateVehicle = asyncHandler(async (req, res) => {
  const data = parseOrThrow(updateVehicleSchema, req.body);
  const { id } = req.params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  if (data.registrationNumber && data.registrationNumber !== vehicle.registrationNumber) {
    const existing = await prisma.vehicle.findUnique({
      where: { registrationNumber: data.registrationNumber },
    });
    if (existing) throw new ApiError(409, "A vehicle with this registration number already exists");
  }

  const updated = await prisma.vehicle.update({ where: { id }, data });
  res.json(new ApiResponse(200, updated, "Vehicle updated successfully"));
});

// ─── DELETE /api/vehicles/:id ───────────────────────────────────────────────────
export const deleteVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  const tripCount = await prisma.trip.count({ where: { vehicleId: id } });
  if (tripCount > 0) {
    throw new ApiError(
      409,
      "This vehicle has trip history and cannot be deleted. Set its status to RETIRED instead."
    );
  }

  await prisma.vehicle.delete({ where: { id } });
  res.json(new ApiResponse(200, null, "Vehicle deleted successfully"));
});

// ─── GET /api/vehicles/:id/operational-cost ─────────────────────────────────
export const getOperationalCost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  const [fuelAgg, maintenanceAgg] = await Promise.all([
    prisma.fuelLog.aggregate({ where: { vehicleId: id }, _sum: { cost: true } }),
    prisma.expense.aggregate({
      where: { vehicleId: id, type: "MAINTENANCE" },
      _sum: { amount: true },
    }),
  ]);

  const fuelCost = Number(fuelAgg._sum.cost ?? 0);
  const maintenanceCost = Number(maintenanceAgg._sum.amount ?? 0);

  res.json(
    new ApiResponse(
      200,
      { fuelCost, maintenanceCost, totalOperationalCost: fuelCost + maintenanceCost },
      "Operational cost retrieved successfully"
    )
  );
});
