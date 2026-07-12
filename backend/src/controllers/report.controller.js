import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const EXPORTERS = {
  vehicles: {
    columns: [
      "id",
      "registrationNumber",
      "name",
      "type",
      "maxLoadCapacityKg",
      "odometerKm",
      "acquisitionCost",
      "status",
      "region",
    ],
    fetch: () => prisma.vehicle.findMany(),
  },
  drivers: {
    columns: [
      "id",
      "name",
      "licenseNumber",
      "licenseCategory",
      "licenseExpiryDate",
      "contactNumber",
      "safetyScore",
      "status",
      "tripsCompletedCount",
      "tripsAssignedCount",
    ],
    fetch: () => prisma.driver.findMany(),
  },
  trips: {
    columns: [
      "id",
      "source",
      "destination",
      "vehicleId",
      "driverId",
      "cargoWeightKg",
      "plannedDistanceKm",
      "actualDistanceKm",
      "revenue",
      "etaMinutes",
      "status",
      "dispatchedAt",
      "completedAt",
    ],
    fetch: () => prisma.trip.findMany(),
  },
};

const escapeCsv = (val) => {
  if (val === null || val === undefined) return "";
  const str = val instanceof Date ? val.toISOString() : String(val);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// ─── GET /api/reports/export/csv?type=vehicles|drivers|trips ───────────────
export const exportCsv = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const exporter = EXPORTERS[type];
  if (!exporter) {
    throw new ApiError(400, "Invalid export type. Must be one of: vehicles, drivers, trips");
  }

  const rows = await exporter.fetch();
  const lines = [
    exporter.columns.join(","),
    ...rows.map((row) => exporter.columns.map((c) => escapeCsv(row[c])).join(",")),
  ];

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-export.csv"`);
  res.send(lines.join("\n"));
});
