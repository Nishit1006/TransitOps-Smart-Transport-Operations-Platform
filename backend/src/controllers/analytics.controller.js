import prisma from "../config/prisma.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─── GET /api/analytics/summary ──────────────────────────────────────────────
export const getAnalyticsSummary = asyncHandler(async (_req, res) => {
  const [
    completedTrips,
    activeVehicleCount,
    onTripVehicleCount,
    vehicles,
    fuelByVehicle,
    maintenanceByVehicle,
    revenueByVehicle,
  ] = await Promise.all([
    prisma.trip.findMany({
      where: { status: "COMPLETED", actualDistanceKm: { not: null }, fuelConsumedLiters: { not: null } },
      select: { actualDistanceKm: true, fuelConsumedLiters: true },
    }),
    prisma.vehicle.count({ where: { status: { not: "RETIRED" } } }),
    prisma.vehicle.count({ where: { status: "ON_TRIP" } }),
    prisma.vehicle.findMany({ select: { id: true, acquisitionCost: true } }),
    prisma.fuelLog.groupBy({ by: ["vehicleId"], _sum: { cost: true } }),
    prisma.expense.groupBy({ by: ["vehicleId"], where: { type: "MAINTENANCE" }, _sum: { amount: true } }),
    prisma.trip.groupBy({ by: ["vehicleId"], where: { revenue: { not: null } }, _sum: { revenue: true } }),
  ]);

  const efficiencies = completedTrips
    .filter((t) => Number(t.fuelConsumedLiters) > 0)
    .map((t) => Number(t.actualDistanceKm) / Number(t.fuelConsumedLiters));
  const fuelEfficiency = efficiencies.length
    ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length
    : 0;

  const fleetUtilization = activeVehicleCount > 0 ? (onTripVehicleCount / activeVehicleCount) * 100 : 0;

  const fuelMap = new Map(fuelByVehicle.map((f) => [f.vehicleId, Number(f._sum.cost ?? 0)]));
  const maintMap = new Map(maintenanceByVehicle.map((m) => [m.vehicleId, Number(m._sum.amount ?? 0)]));
  const revenueMap = new Map(revenueByVehicle.map((r) => [r.vehicleId, Number(r._sum.revenue ?? 0)]));

  const totalFuelCost = [...fuelMap.values()].reduce((a, b) => a + b, 0);
  const totalMaintenanceCost = [...maintMap.values()].reduce((a, b) => a + b, 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

  const rois = vehicles
    .filter((v) => Number(v.acquisitionCost) > 0)
    .map((v) => {
      const fuelCost = fuelMap.get(v.id) ?? 0;
      const maintenanceCost = maintMap.get(v.id) ?? 0;
      const revenue = revenueMap.get(v.id) ?? 0;
      return (revenue - (maintenanceCost + fuelCost)) / Number(v.acquisitionCost);
    });
  const avgVehicleROI = rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : 0;

  res.json(
    new ApiResponse(
      200,
      {
        fuelEfficiency: Math.round(fuelEfficiency * 100) / 100,
        fleetUtilization: Math.round(fleetUtilization * 10) / 10,
        totalOperationalCost: Math.round(totalOperationalCost * 100) / 100,
        avgVehicleROI: Math.round(avgVehicleROI * 1000) / 1000,
      },
      "Analytics summary retrieved successfully"
    )
  );
});

// ─── GET /api/analytics/monthly-revenue ──────────────────────────────────────
export const getMonthlyRevenue = asyncHandler(async (_req, res) => {
  const trips = await prisma.trip.findMany({
    where: { status: "COMPLETED", revenue: { not: null } },
    select: { revenue: true, completedAt: true, createdAt: true },
  });

  const byMonth = new Map();
  for (const t of trips) {
    const d = t.completedAt ?? t.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(t.revenue));
  }

  const monthlyRevenue = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }));

  res.json(new ApiResponse(200, monthlyRevenue, "Monthly revenue retrieved successfully"));
});

// ─── GET /api/analytics/top-costliest-vehicles ───────────────────────────────
export const getTopCostliestVehicles = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 20);

  const [vehicles, fuelByVehicle, expenseByVehicle] = await Promise.all([
    prisma.vehicle.findMany({ select: { id: true, name: true, registrationNumber: true } }),
    prisma.fuelLog.groupBy({ by: ["vehicleId"], _sum: { cost: true } }),
    prisma.expense.groupBy({ by: ["vehicleId"], _sum: { amount: true } }),
  ]);

  const fuelMap = new Map(fuelByVehicle.map((f) => [f.vehicleId, Number(f._sum.cost ?? 0)]));
  const expenseMap = new Map(expenseByVehicle.map((e) => [e.vehicleId, Number(e._sum.amount ?? 0)]));

  const ranked = vehicles
    .map((v) => {
      const fuelCost = fuelMap.get(v.id) ?? 0;
      const expenseCost = expenseMap.get(v.id) ?? 0;
      return {
        vehicleId: v.id,
        name: v.name,
        registrationNumber: v.registrationNumber,
        totalCost: Math.round((fuelCost + expenseCost) * 100) / 100,
      };
    })
    .filter((v) => v.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, limit);

  res.json(new ApiResponse(200, ranked, "Top costliest vehicles retrieved successfully"));
});
