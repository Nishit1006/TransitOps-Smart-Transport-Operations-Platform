import { z } from "zod";

const EXPENSE_TYPES = ["TOLL", "FUEL", "MAINTENANCE", "FINE", "OTHER"];

export const createExpenseSchema = z.object({
  vehicleId: z.string().trim().min(1, "vehicleId is required"),
  tripId: z.string().trim().min(1).optional().nullable(),
  type: z.enum(EXPENSE_TYPES, { message: "Invalid expense type" }),
  amount: z.coerce.number().min(0, "amount must be >= 0"),
  description: z.string().trim().min(1).optional().nullable(),
  date: z.coerce.date().optional(),
});

export const expenseQuerySchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  tripId: z.string().trim().min(1).optional(),
  type: z.enum(EXPENSE_TYPES).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
