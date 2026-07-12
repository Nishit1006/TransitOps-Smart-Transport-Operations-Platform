import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseOrThrow } from "../utils/validate.js";
import { createDriverSchema, updateDriverSchema, driverQuerySchema } from "../validators/driver.validator.js";

// ─── GET /api/drivers ─────────────────────────────────────────────────────────
export const getDrivers = asyncHandler(async (req, res) => {
  const { status, licenseCategory, list } = parseOrThrow(driverQuerySchema, req.query);

  const where = {
    ...(status && { status }),
    ...(licenseCategory && { licenseCategory }),
  };

  if (list === "true") {
    const drivers = await prisma.driver.findMany({
      where,
      select: { id: true, name: true, status: true, licenseExpiryDate: true },
      orderBy: { name: "asc" },
    });
    return res.json(new ApiResponse(200, drivers, "Driver list retrieved successfully"));
  }

  const drivers = await prisma.driver.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(new ApiResponse(200, drivers, "Drivers retrieved successfully"));
});

// ─── GET /api/drivers/:id ───────────────────────────────────────────────────────
export const getDriverById = asyncHandler(async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!driver) throw new ApiError(404, "Driver not found");
  res.json(new ApiResponse(200, driver, "Driver retrieved successfully"));
});

// ─── POST /api/drivers ─────────────────────────────────────────────────────────
export const createDriver = asyncHandler(async (req, res) => {
  const data = parseOrThrow(createDriverSchema, req.body);

  const existing = await prisma.driver.findUnique({ where: { licenseNumber: data.licenseNumber } });
  if (existing) throw new ApiError(409, "A driver with this license number already exists");

  const driver = await prisma.driver.create({ data });
  res.status(201).json(new ApiResponse(201, driver, "Driver created successfully"));
});

// ─── PUT /api/drivers/:id ────────────────────────────────────────────────────────
export const updateDriver = asyncHandler(async (req, res) => {
  const data = parseOrThrow(updateDriverSchema, req.body);
  const { id } = req.params;

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw new ApiError(404, "Driver not found");

  if (data.licenseNumber && data.licenseNumber !== driver.licenseNumber) {
    const existing = await prisma.driver.findUnique({ where: { licenseNumber: data.licenseNumber } });
    if (existing) throw new ApiError(409, "A driver with this license number already exists");
  }

  const updated = await prisma.driver.update({ where: { id }, data });
  res.json(new ApiResponse(200, updated, "Driver updated successfully"));
});

// ─── DELETE /api/drivers/:id ─────────────────────────────────────────────────────
export const deleteDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw new ApiError(404, "Driver not found");

  const tripCount = await prisma.trip.count({ where: { driverId: id } });
  if (tripCount > 0) {
    throw new ApiError(
      409,
      "This driver has trip history and cannot be deleted. Set their status to OFF_DUTY or SUSPENDED instead."
    );
  }

  await prisma.driver.delete({ where: { id } });
  res.json(new ApiResponse(200, null, "Driver deleted successfully"));
});
