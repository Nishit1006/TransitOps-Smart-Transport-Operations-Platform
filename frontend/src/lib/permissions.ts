export const ROLES = [
  "FLEET_MANAGER",
  "DISPATCHER",
  "SAFETY_OFFICER",
  "FINANCIAL_ANALYST",
  "ADMIN",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Single source of truth for role -> permission mapping, mirrored by hand
 * in backend/src/config/permissions.js. The two apps are separate
 * deployables with no shared package, so this file and its backend twin
 * must be kept in sync manually — if they drift, the nav could show a link
 * the API will actually 403 on, or hide one it would allow. See README
 * "Auth & Roles" for this risk.
 */
export const PERMISSIONS = {
  dashboard: ROLES,
  analytics: ROLES,
  fuelExpenses: ROLES,
  manageFuelExpenses: ["FINANCIAL_ANALYST", "ADMIN"],
  settings: ["FLEET_MANAGER", "ADMIN"],
  manageUsers: ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
