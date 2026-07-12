import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { updateSettingsSchema } from "../validators/settings.validator.js";

// OrgSettings is a singleton row — this API only ever reads/updates it,
// never creates a new one. The row is expected to already exist (created
// by the seed script); if it doesn't, that's a deployment issue to surface,
// not something to silently paper over here.
const SETTINGS_ID = "default";

// ─── GET /api/settings ────────────────────────────────────────────────────────
export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await prisma.orgSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings) {
    throw new ApiError(404, "Org settings have not been initialized. Run the seed script.");
  }

  res.json(new ApiResponse(200, settings, "Org settings retrieved successfully"));
});

// ─── PUT /api/settings ─────────────────────────────────────────────────────────
export const updateSettings = asyncHandler(async (req, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));
    throw new ApiError(400, "Validation failed", errors);
  }

  const existing = await prisma.orgSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!existing) {
    throw new ApiError(404, "Org settings have not been initialized. Run the seed script.");
  }

  const settings = await prisma.orgSettings.update({
    where: { id: SETTINGS_ID },
    data: parsed.data,
  });

  res.json(new ApiResponse(200, settings, "Org settings updated successfully"));
});
