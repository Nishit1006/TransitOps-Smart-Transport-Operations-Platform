import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseOrThrow } from "../utils/validate.js";
import { createMaintenanceLogSchema, maintenanceQuerySchema } from "../validators/maintenance.validator.js";

// ─── POST /api/maintenance-logs ───────────────────────────────────────────────
// Opening a log takes the vehicle out of the AVAILABLE pool used by trip
// creation. Requiring AVAILABLE up front also rules out double-opening a log
// on a vehicle already IN_SHOP, or servicing one that's ON_TRIP/RETIRED.
export const createMaintenanceLog = asyncHandler(async (req, res) => {
  const data = parseOrThrow(createMaintenanceLogSchema, req.body);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  if (vehicle.status !== "AVAILABLE") {
    throw new ApiError(
      400,
      `Vehicle ${vehicle.registrationNumber} is not AVAILABLE (current status: ${vehicle.status}) and cannot be sent to maintenance.`
    );
  }

  // getOperationalCost and the analytics cost/ROI aggregates sum the Expense
  // table (type=MAINTENANCE), not MaintenanceLog.cost directly — mirroring
  // how trip completion also writes a FuelLog, this also writes the Expense
  // row so the cost actually flows into those existing screens.
  const log = await prisma.$transaction(async (tx) => {
    const [createdLog] = await Promise.all([
      tx.maintenanceLog.create({ data: { ...data, status: "IN_SHOP" } }),
      tx.vehicle.update({ where: { id: data.vehicleId }, data: { status: "IN_SHOP" } }),
      tx.expense.create({
        data: {
          vehicleId: data.vehicleId,
          type: "MAINTENANCE",
          amount: data.cost,
          description: data.serviceType,
          ...(data.serviceDate && { date: data.serviceDate }),
        },
      }),
    ]);
    return createdLog;
  });

  res.status(201).json(new ApiResponse(201, log, "Maintenance log created and vehicle marked IN_SHOP"));
});

// ─── POST /api/maintenance-logs/:id/close ──────────────────────────────────────
export const closeMaintenanceLog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const log = await prisma.maintenanceLog.findUnique({ where: { id } });
  if (!log) throw new ApiError(404, "Maintenance log not found");
  if (log.status !== "IN_SHOP") {
    throw new ApiError(400, `Maintenance log is already ${log.status}.`);
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: log.vehicleId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  const updated = await prisma.$transaction(async (tx) => {
    const [updatedLog] = await Promise.all([
      tx.maintenanceLog.update({ where: { id }, data: { status: "COMPLETED", closedAt: new Date() } }),
      // Vehicle may have been separately marked RETIRED while in the shop —
      // leave it RETIRED instead of bouncing it back to AVAILABLE.
      tx.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: vehicle.status === "RETIRED" ? "RETIRED" : "AVAILABLE" },
      }),
    ]);
    return updatedLog;
  });

  res.json(new ApiResponse(200, updated, "Maintenance log closed and vehicle restored"));
});

// ─── GET /api/maintenance-logs ──────────────────────────────────────────────────
export const getMaintenanceLogs = asyncHandler(async (req, res) => {
  const { vehicleId, status } = parseOrThrow(maintenanceQuerySchema, req.query);

  const where = {
    ...(vehicleId && { vehicleId }),
    ...(status && { status }),
  };

  const logs = await prisma.maintenanceLog.findMany({
    where,
    include: { vehicle: { select: { id: true, name: true, registrationNumber: true } } },
    orderBy: { serviceDate: "desc" },
  });

  res.json(new ApiResponse(200, logs, "Maintenance logs retrieved successfully"));
});
