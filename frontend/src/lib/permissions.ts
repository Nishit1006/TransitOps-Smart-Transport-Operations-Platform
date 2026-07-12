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
  vehicles: ROLES,
  manageVehicles: ["FLEET_MANAGER", "ADMIN"],
  drivers: ROLES,
  // SAFETY_OFFICER manages compliance fields (license, safety score) per spec;
  // simplified to full record edit access rather than field-level permissions.
  manageDrivers: ["FLEET_MANAGER", "ADMIN", "SAFETY_OFFICER"],
  trips: ROLES,
  manageTrips: ["DISPATCHER", "ADMIN"],
  maintenance: ROLES,
  manageMaintenance: ["FLEET_MANAGER", "ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

/**
 * Route -> permission map. This is the single source of truth for which
 * permission a URL requires — both the nav (AppShell, for labels + filtering)
 * and proxy.ts (for the route-level redirect check) read from this same
 * array. Add a new role-restricted page here and both nav visibility and
 * proxy enforcement pick it up automatically; no proxy.ts branch needed.
 */
export const NAV_ITEMS: { href: string; label: string; permission: Permission }[] = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard" },
  { href: "/trips", label: "Trips", permission: "trips" },
  { href: "/vehicles", label: "Vehicles", permission: "vehicles" },
  { href: "/drivers", label: "Drivers", permission: "drivers" },
  { href: "/maintenance", label: "Maintenance", permission: "maintenance" },
  { href: "/fuel-expenses", label: "Fuel & Expenses", permission: "fuelExpenses" },
  { href: "/analytics", label: "Analytics", permission: "analytics" },
  { href: "/settings", label: "Settings", permission: "settings" },
  { href: "/admin/users", label: "Create User", permission: "manageUsers" },
];

export function permissionForPath(pathname: string): Permission | undefined {
  // Longest-prefix match first, so a more specific route (e.g. /admin/users)
  // wins over a shorter one that happens to also prefix-match.
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.permission;
}
