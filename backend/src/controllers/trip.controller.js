import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseOrThrow } from "../utils/validate.js";
import { createTripSchema, completeTripSchema, tripQuerySchema } from "../validators/trip.validator.js";

const TRIP_INCLUDE = {
  vehicle: { select: { id: true, name: true, registrationNumber: true, status: true, type: true } },
  driver: { select: { id: true, name: true, status: true, licenseExpiryDate: true } },
};

// ─── POST /api/trips ──────────────────────────────────────────────────────────
// Create as DRAFT. Vehicle/driver availability is validated now, but DRAFT
// doesn't reserve them (status only flips to ON_TRIP on dispatch) — dispatch
// re-validates to close the race where two drafts target the same resource.
export const createTrip = asyncHandler(async (req, res) => {
  const data = parseOrThrow(createTripSchema, req.body);

  const [vehicle, driver] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: data.vehicleId } }),
    prisma.driver.findUnique({ where: { id: data.driverId } }),
  ]);

  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  if (!driver) throw new ApiError(404, "Driver not found");

  if (vehicle.status !== "AVAILABLE") {
    throw new ApiError(
      400,
      `Vehicle ${vehicle.registrationNumber} is not available (current status: ${vehicle.status}). Only AVAILABLE vehicles can be assigned to a trip.`
    );
  }

  if (driver.status === "SUSPENDED") {
    throw new ApiError(400, `Driver ${driver.name} is suspended and cannot be assigned to a trip.`);
  }

  if (driver.status !== "AVAILABLE") {
    throw new ApiError(
      400,
      `Driver ${driver.name} is not available (current status: ${driver.status}). Only AVAILABLE drivers can be assigned to a trip.`
    );
  }

  if (driver.licenseExpiryDate <= new Date()) {
    throw new ApiError(
      400,
      `Driver ${driver.name}'s license expired on ${driver.licenseExpiryDate.toISOString().slice(0, 10)} and cannot be assigned to a trip.`
    );
  }

  if (Number(data.cargoWeightKg) > Number(vehicle.maxLoadCapacityKg)) {
    throw new ApiError(
      400,
      `Cargo weight (${data.cargoWeightKg}kg) exceeds vehicle ${vehicle.registrationNumber}'s max load capacity (${vehicle.maxLoadCapacityKg}kg).`
    );
  }

  const trip = await prisma.trip.create({
    data: { ...data, createdById: req.user.id },
    include: TRIP_INCLUDE,
  });

  res.status(201).json(new ApiResponse(201, trip, "Trip created as draft successfully"));
});

// ─── GET /api/trips ───────────────────────────────────────────────────────────
export const getTrips = asyncHandler(async (req, res) => {
  const { status, vehicleId, driverId } = parseOrThrow(tripQuerySchema, req.query);

  const where = {
    ...(status && { status }),
    ...(vehicleId && { vehicleId }),
    ...(driverId && { driverId }),
  };

  const trips = await prisma.trip.findMany({ where, include: TRIP_INCLUDE, orderBy: { createdAt: "desc" } });
  res.json(new ApiResponse(200, trips, "Trips retrieved successfully"));
});

// ─── GET /api/trips/:id ────────────────────────────────────────────────────────
export const getTripById = asyncHandler(async (req, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id }, include: TRIP_INCLUDE });
  if (!trip) throw new ApiError(404, "Trip not found");
  res.json(new ApiResponse(200, trip, "Trip retrieved successfully"));
});

// ─── POST /api/trips/:id/dispatch ──────────────────────────────────────────────
export const dispatchTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) throw new ApiError(404, "Trip not found");
  if (trip.status !== "DRAFT") {
    throw new ApiError(400, `Trip is ${trip.status}. Only DRAFT trips can be dispatched.`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicleId } });
    const driver = await tx.driver.findUnique({ where: { id: trip.driverId } });

    if (!vehicle || vehicle.status !== "AVAILABLE") {
      throw new ApiError(
        400,
        `Vehicle is no longer available (current status: ${vehicle?.status ?? "unknown"}). Cannot dispatch — it may have been assigned to another trip.`
      );
    }
    if (!driver || driver.status !== "AVAILABLE") {
      throw new ApiError(
        400,
        `Driver is no longer available (current status: ${driver?.status ?? "unknown"}). Cannot dispatch — they may have been assigned to another trip.`
      );
    }
    if (driver.licenseExpiryDate <= new Date()) {
      throw new ApiError(400, "Driver's license has expired since this trip was drafted. Cannot dispatch.");
    }

    const [updatedTrip] = await Promise.all([
      tx.trip.update({
        where: { id },
        data: { status: "DISPATCHED", dispatchedAt: new Date(), startOdometerKm: vehicle.odometerKm },
        include: TRIP_INCLUDE,
      }),
      tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "ON_TRIP" } }),
      tx.driver.update({
        where: { id: trip.driverId },
        data: { status: "ON_TRIP", tripsAssignedCount: { increment: 1 } },
      }),
    ]);

    return updatedTrip;
  });

  res.json(new ApiResponse(200, updated, "Trip dispatched successfully"));
});

// ─── POST /api/trips/:id/complete ──────────────────────────────────────────────
export const completeTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = parseOrThrow(completeTripSchema, req.body);

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) throw new ApiError(404, "Trip not found");
  if (trip.status !== "DISPATCHED") {
    throw new ApiError(400, `Trip is ${trip.status}. Only DISPATCHED trips can be completed.`);
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: trip.vehicleId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  const startOdometer = Number(trip.startOdometerKm ?? vehicle.odometerKm);
  if (data.endOdometerKm < startOdometer) {
    throw new ApiError(
      400,
      `End odometer (${data.endOdometerKm}km) cannot be less than the trip's start odometer (${startOdometer}km).`
    );
  }

  const actualDistanceKm = data.endOdometerKm - startOdometer;

  const updated = await prisma.$transaction(async (tx) => {
    const [updatedTrip] = await Promise.all([
      tx.trip.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          endOdometerKm: data.endOdometerKm,
          actualDistanceKm,
          fuelConsumedLiters: data.fuelConsumedLiters,
          ...(data.revenue !== undefined && { revenue: data.revenue }),
        },
        include: TRIP_INCLUDE,
      }),
      tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "AVAILABLE", odometerKm: data.endOdometerKm },
      }),
      tx.driver.update({
        where: { id: trip.driverId },
        data: { status: "AVAILABLE", tripsCompletedCount: { increment: 1 } },
      }),
      tx.fuelLog.create({
        data: {
          vehicleId: trip.vehicleId,
          tripId: trip.id,
          liters: data.fuelConsumedLiters,
          cost: data.fuelCost ?? 0,
        },
      }),
    ]);

    return updatedTrip;
  });

  res.json(new ApiResponse(200, updated, "Trip completed successfully"));
});

// ─── POST /api/trips/:id/cancel ────────────────────────────────────────────────
// Allowed from DRAFT or DISPATCHED. A DRAFT trip never reserved the vehicle/
// driver, so there's nothing to restore for that case — only a DISPATCHED
// cancel needs to flip them back to AVAILABLE.
export const cancelTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) throw new ApiError(404, "Trip not found");
  if (trip.status !== "DRAFT" && trip.status !== "DISPATCHED") {
    throw new ApiError(400, `Trip is ${trip.status}. Only DRAFT or DISPATCHED trips can be cancelled.`);
  }

  const wasDispatched = trip.status === "DISPATCHED";

  const updated = await prisma.$transaction(async (tx) => {
    const ops = [
      tx.trip.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
        include: TRIP_INCLUDE,
      }),
    ];
    if (wasDispatched) {
      ops.push(tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "AVAILABLE" } }));
      ops.push(tx.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } }));
    }
    const [updatedTrip] = await Promise.all(ops);
    return updatedTrip;
  });

  res.json(new ApiResponse(200, updated, "Trip cancelled successfully"));
});
