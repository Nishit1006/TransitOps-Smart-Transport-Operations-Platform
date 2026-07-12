export const ROLES = ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST", "ADMIN"];

/**
 * Single source of truth for role -> permission mapping.
 *
 * Mirrored by hand in frontend/src/lib/permissions.ts, which drives nav
 * visibility. The backend and frontend are separate deployables with no
 * shared package, so this file and its frontend twin must be kept in sync
 * manually — if they drift, the nav could show/hide links that don't match
 * what the API actually allows. See README "Auth & Roles" for this risk.
 */
export const PERMISSIONS = {
  dashboard: ROLES,
  analytics: ROLES,
  fuelExpenses: ROLES,
  manageFuelExpenses: ["FINANCIAL_ANALYST", "ADMIN"],
  settings: ["FLEET_MANAGER", "ADMIN"],
  manageUsers: ["ADMIN"],
};
