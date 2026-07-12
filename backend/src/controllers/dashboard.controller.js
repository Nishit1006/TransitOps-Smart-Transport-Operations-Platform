import prisma from "../config/prisma.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─── GET /api/dashboard/kpis ─────────────────────────────────────────────────
export const getKpis = asyncHandler(async (_req, res) => {
  const [
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    onTripVehicles,
    activeTrips,
    pendingTrips,
    driversOnDuty,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { status: { not: "RETIRED" } } }),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { status: "IN_SHOP" } }),
    prisma.vehicle.count({ where: { status: "ON_TRIP" } }),
    prisma.trip.count({ where: { status: "DISPATCHED" } }),
    prisma.trip.count({ where: { status: "DRAFT" } }),
    prisma.driver.count({ where: { status: "ON_TRIP" } }),
  ]);

  const fleetUtilization = activeVehicles > 0 ? (onTripVehicles / activeVehicles) * 100 : 0;

  res.json(
    new ApiResponse(
      200,
      {
        activeVehicles,
        availableVehicles,
        vehiclesInMaintenance,
        activeTrips,
        pendingTrips,
        driversOnDuty,
        fleetUtilization: Math.round(fleetUtilization * 10) / 10,
      },
      "Dashboard KPIs retrieved successfully"
    )
  );
});

// ─── GET /api/dashboard/recent-trips ─────────────────────────────────────────
export const getRecentTrips = asyncHandler(async (_req, res) => {
  const trips = await prisma.trip.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: {
        select: { id: true, name: true, registrationNumber: true, type: true, status: true, region: true },
      },
      driver: { select: { id: true, name: true, status: true } },
    },
  });

  res.json(new ApiResponse(200, trips, "Recent trips retrieved successfully"));
});

// ─── GET /api/dashboard/vehicle-status-breakdown ─────────────────────────────
export const getVehicleStatusBreakdown = asyncHandler(async (_req, res) => {
  const grouped = await prisma.vehicle.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const breakdown = grouped.map((g) => ({ status: g.status, count: g._count._all }));

  res.json(new ApiResponse(200, breakdown, "Vehicle status breakdown retrieved successfully"));
});
