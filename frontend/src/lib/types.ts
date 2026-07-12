export const VEHICLE_TYPES = ["TRUCK", "VAN", "MINI", "TRAILER", "OTHER"] as const;
export const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"] as const;
export const TRIP_STATUSES = ["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"] as const;
export const EXPENSE_TYPES = ["TOLL", "FUEL", "MAINTENANCE", "FINE", "OTHER"] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];
export type TripStatus = (typeof TRIP_STATUSES)[number];
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

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
