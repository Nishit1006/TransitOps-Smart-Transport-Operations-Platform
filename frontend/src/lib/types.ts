export const VEHICLE_TYPES = ["TRUCK", "VAN", "MINI", "TRAILER", "OTHER"] as const;
export const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"] as const;
export const TRIP_STATUSES = ["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"] as const;
export const EXPENSE_TYPES = ["TOLL", "FUEL", "MAINTENANCE", "FINE", "OTHER"] as const;
export const LICENSE_CATEGORIES = ["LMV", "HMV", "MOTORCYCLE", "COMMERCIAL", "OTHER"] as const;
export const DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"] as const;
export const MAINTENANCE_STATUSES = ["IN_SHOP", "COMPLETED"] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];
export type TripStatus = (typeof TRIP_STATUSES)[number];
export type ExpenseType = (typeof EXPENSE_TYPES)[number];
export type LicenseCategory = (typeof LICENSE_CATEGORIES)[number];
export type DriverStatus = (typeof DRIVER_STATUSES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export type DashboardKpis = {
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
};

export type TripVehicle = {
  id: string;
  name: string;
  registrationNumber: string;
  type: VehicleType;
  status: VehicleStatus;
  region: string | null;
};

export type TripDriver = {
  id: string;
  name: string;
  status: string;
};

export type RecentTrip = {
  id: string;
  source: string;
  destination: string;
  status: TripStatus;
  etaMinutes: number | null;
  vehicle: TripVehicle;
  driver: TripDriver;
};

export type VehicleStatusBreakdownEntry = {
  status: VehicleStatus;
  count: number;
};

export type FuelLog = {
  id: string;
  vehicleId: string;
  tripId: string | null;
  liters: string;
  cost: string;
  date: string;
};

export type Expense = {
  id: string;
  vehicleId: string;
  tripId: string | null;
  type: ExpenseType;
  amount: string;
  description: string | null;
  date: string;
};

export type Vehicle = {
  id: string;
  registrationNumber: string;
  name: string;
  type: VehicleType;
  maxLoadCapacityKg: string;
  odometerKm: string;
  acquisitionCost: string;
  status: VehicleStatus;
  region: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleListItem = {
  id: string;
  name: string;
  registrationNumber: string;
  status: VehicleStatus;
};

export type Driver = {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: LicenseCategory;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: string;
  status: DriverStatus;
  tripsCompletedCount: number;
  tripsAssignedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DriverListItem = {
  id: string;
  name: string;
  status: DriverStatus;
  licenseExpiryDate: string;
};

export type Trip = {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeightKg: string;
  plannedDistanceKm: string;
  actualDistanceKm: string | null;
  startOdometerKm: string | null;
  endOdometerKm: string | null;
  fuelConsumedLiters: string | null;
  revenue: string | null;
  etaMinutes: number | null;
  status: TripStatus;
  dispatchedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  vehicle: TripVehicle;
  driver: TripDriver;
};

export type MaintenanceLog = {
  id: string;
  vehicleId: string;
  serviceType: string;
  cost: string;
  status: MaintenanceStatus;
  serviceDate: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: { id: string; name: string; registrationNumber: string };
};

export type OrgSettings = {
  id: string;
  depotName: string;
  currency: string;
  distanceUnit: "KM" | "MILES";
  updatedAt: string;
};

export type AnalyticsSummary = {
  fuelEfficiency: number;
  fleetUtilization: number;
  totalOperationalCost: number;
  avgVehicleROI: number;
};
