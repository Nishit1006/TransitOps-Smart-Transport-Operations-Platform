import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createExpenseSchema, expenseQuerySchema } from "../validators/expense.validator.js";

// ─── POST /api/expenses ──────────────────────────────────────────────────────
export const createExpense = asyncHandler(async (req, res) => {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { vehicleId, tripId, type, amount, description, date } = parsed.data;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new ApiError(404, "Trip not found");
  }

  const expense = await prisma.expense.create({
    data: {
      vehicleId,
      tripId: tripId ?? null,
      type,
      amount,
      description: description ?? null,
      ...(date && { date }),
    },
  });

  res.status(201).json(new ApiResponse(201, expense, "Expense created successfully"));
});

// ─── GET /api/expenses ───────────────────────────────────────────────────────
export const getExpenses = asyncHandler(async (req, res) => {
  const parsed = expenseQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const { vehicleId, tripId, type, startDate, endDate } = parsed.data;

  const where = {
    ...(vehicleId && { vehicleId }),
    ...(tripId && { tripId }),
    ...(type && { type }),
    ...((startDate || endDate) && {
      date: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    }),
  };

  const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" } });
  res.json(new ApiResponse(200, expenses, "Expenses retrieved successfully"));
});
