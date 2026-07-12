import { z } from "zod";

export const updateSettingsSchema = z.object({
  depotName: z.string().trim().min(1, "Depot name is required"),
  currency: z.string().trim().min(1, "Currency is required"),
  distanceUnit: z.enum(["KM", "MILES"], { message: "Invalid distance unit" }),
});
