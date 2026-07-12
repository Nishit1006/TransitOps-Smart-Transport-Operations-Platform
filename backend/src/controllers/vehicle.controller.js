import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

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
