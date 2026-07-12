import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BCRYPT_SALT_ROUNDS = 10;
const DEMO_PASSWORD = "Password123!";

// All seeded accounts share the same demo password for simplicity — see README.
const USERS = [
  { name: "Ava Ahuja", email: "admin@transitops.com", role: "ADMIN" },
  { name: "Felix Ferreira", email: "fleet.manager@transitops.com", role: "FLEET_MANAGER" },
  { name: "Dana Diaz", email: "dispatcher@transitops.com", role: "DISPATCHER" },
  { name: "Sam Suresh", email: "safety.officer@transitops.com", role: "SAFETY_OFFICER" },
  { name: "Farah Fontaine", email: "financial.analyst@transitops.com", role: "FINANCIAL_ANALYST" },
];

// Registered by hand, not upserted from a generic loop, because each one
// plays a specific role in the demo (the lifecycle trip, the in-shop
// vehicle, plain registry filler) — see the notes below.
const VEHICLES = [
  { registrationNumber: "TN-01-VAN-05", name: "Van-05", type: "VAN", maxLoadCapacityKg: 500, acquisitionCost: 25000, region: "North" },
  { registrationNumber: "TN-02-TRK-12", name: "Truck-12", type: "TRUCK", maxLoadCapacityKg: 3000, acquisitionCost: 65000, region: "South" },
  { registrationNumber: "TN-03-MIN-03", name: "Mini-03", type: "MINI", maxLoadCapacityKg: 200, acquisitionCost: 12000, region: "North" },
  { registrationNumber: "TN-04-TRL-08", name: "Trailer-08", type: "TRAILER", maxLoadCapacityKg: 5000, acquisitionCost: 90000, region: "East" },
];

const DRIVERS = [
  { licenseNumber: "DL-ALEX-01", name: "Alex Rivera", licenseCategory: "LMV", licenseExpiryDate: new Date("2030-01-01"), contactNumber: "555-0100" },
  { licenseNumber: "DL-PRIYA-01", name: "Priya Nair", licenseCategory: "HMV", licenseExpiryDate: new Date("2029-06-15"), contactNumber: "555-0101" },
  { licenseNumber: "DL-JORDAN-01", name: "Jordan Lee", licenseCategory: "COMMERCIAL", licenseExpiryDate: new Date("2028-11-20"), contactNumber: "555-0102", status: "OFF_DUTY" },
  { licenseNumber: "DL-MORGAN-01", name: "Morgan Diaz", licenseCategory: "LMV", licenseExpiryDate: new Date("2029-03-10"), contactNumber: "555-0103" },
];

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        isActive: true,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        isActive: true,
        isEmailVerified: true,
      },
    });
  }
}

async function seedVehiclesAndDrivers() {
  // On update, only refresh descriptive fields — never force status back.
  // A vehicle/driver's status changes through real usage between reseeds
  // (trips, maintenance); the seed script shouldn't undo that.
  for (const v of VEHICLES) {
    await prisma.vehicle.upsert({
      where: { registrationNumber: v.registrationNumber },
      update: { name: v.name, type: v.type, maxLoadCapacityKg: v.maxLoadCapacityKg, acquisitionCost: v.acquisitionCost, region: v.region },
      create: v,
    });
  }

  for (const d of DRIVERS) {
    await prisma.driver.upsert({
      where: { licenseNumber: d.licenseNumber },
      update: { name: d.name, licenseCategory: d.licenseCategory, licenseExpiryDate: d.licenseExpiryDate, contactNumber: d.contactNumber },
      create: d,
    });
  }
}

async function seedTripLifecycle() {
  const vehicle = await prisma.vehicle.findUnique({ where: { registrationNumber: "TN-01-VAN-05" } });
  const driver = await prisma.driver.findUnique({ where: { licenseNumber: "DL-ALEX-01" } });

  const existing = await prisma.trip.findFirst({
    where: { vehicleId: vehicle.id, driverId: driver.id, status: "COMPLETED" },
  });
  if (existing) return; // Lifecycle already seeded — don't replay it on every run.
  if (vehicle.status !== "AVAILABLE" || driver.status !== "AVAILABLE") return; // In use from a live demo — leave it alone.

  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: "admin@transitops.com" } });

  await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        source: "Depot A",
        destination: "Depot B",
        vehicleId: vehicle.id,
        driverId: driver.id,
        cargoWeightKg: 450,
        plannedDistanceKm: 120,
        createdById: adminUser.id,
      },
    });

    await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: "ON_TRIP" } });
    await tx.driver.update({ where: { id: driver.id }, data: { status: "ON_TRIP", tripsAssignedCount: { increment: 1 } } });
    await tx.trip.update({
      where: { id: trip.id },
      data: { status: "DISPATCHED", dispatchedAt: new Date(), startOdometerKm: vehicle.odometerKm },
    });

    const endOdometerKm = Number(vehicle.odometerKm) + 120;
    await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: "AVAILABLE", odometerKm: endOdometerKm } });
    await tx.driver.update({ where: { id: driver.id }, data: { status: "AVAILABLE", tripsCompletedCount: { increment: 1 } } });
    await tx.fuelLog.create({ data: { vehicleId: vehicle.id, tripId: trip.id, liters: 15, cost: 1800 } });
    await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        endOdometerKm,
        actualDistanceKm: 120,
        fuelConsumedLiters: 15,
        revenue: 6000,
      },
    });
  });
}

async function seedInShopVehicle() {
  const vehicle = await prisma.vehicle.findUnique({ where: { registrationNumber: "TN-03-MIN-03" } });

  const openLog = await prisma.maintenanceLog.findFirst({ where: { vehicleId: vehicle.id, status: "IN_SHOP" } });
  if (openLog) return; // Already has an open log — don't create a second one.
  if (vehicle.status !== "AVAILABLE") return; // Not in a state the seed should touch.

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceLog.create({
      data: { vehicleId: vehicle.id, serviceType: "Engine diagnostic", cost: 800, status: "IN_SHOP" },
    });
    await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: "IN_SHOP" } });
    await tx.expense.create({
      data: { vehicleId: vehicle.id, type: "MAINTENANCE", amount: 800, description: "Engine diagnostic" },
    });
  });
}

async function main() {
  await seedUsers();
  await seedVehiclesAndDrivers();
  await seedTripLifecycle();
  await seedInShopVehicle();

  await prisma.orgSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  console.log("\nSeeded demo accounts (all share the same password):\n");
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
  console.table(USERS.map((u) => ({ role: u.role, email: u.email, name: u.name })));

  console.log("\nSeeded sample vehicles:\n");
  console.table(VEHICLES.map((v) => ({ reg: v.registrationNumber, name: v.name, type: v.type, region: v.region })));

  console.log("\nSeeded sample drivers:\n");
  console.table(DRIVERS.map((d) => ({ name: d.name, license: d.licenseNumber, category: d.licenseCategory })));

  console.log(
    "\nVan-05 + Alex Rivera have one COMPLETED trip (Depot A -> Depot B, 450kg, 120km, ₹1800 fuel, ₹6000 revenue)."
  );
  console.log("Mini-03 has an open maintenance log (IN_SHOP, ₹800 engine diagnostic).\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
