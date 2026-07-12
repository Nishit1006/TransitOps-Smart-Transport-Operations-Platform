# TransitOps — Smart Transport Operations Platform

A full-stack fleet management platform built with **Next.js** (frontend), **Express + Prisma** (backend), and **PostgreSQL** (database).

---

## Prerequisites

Choose **one** of the two setup paths below:

| | Docker Setup | Local Setup |
|---|---|---|
| **Need to install** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) | [Node.js 22+](https://nodejs.org/), [PostgreSQL 17+](https://www.postgresql.org/download/) |
| **Best for** | Quick start, consistent environments | Active development with hot-reload |
| **Commands to run** | 2 commands | ~6 commands |

---

## Option A — Docker (Recommended for Quick Start)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env if you need to change defaults
```

### 2. Start everything

```bash
docker compose up --build
```

> First run will take a few minutes to build images. Subsequent runs use cache.

### 3. Run database migrations (first time only)

```bash
docker compose exec backend npx prisma migrate deploy
```

### 4. Access the app

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000   |
| Backend  | http://localhost:5001   |
| Postgres | `localhost:5432`       |

### Useful Docker commands

```bash
# Stop all services
docker compose down

# Stop and delete database (fresh start)
docker compose down -v

# View logs
docker compose logs -f backend

# Rebuild a single service
docker compose up --build backend

# Open a shell in the backend container
docker compose exec backend sh
```

---

## Option B — Local Development (Without Docker)

### 1. Install PostgreSQL

Make sure PostgreSQL is running locally. Create a database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql
CREATE USER transitops WITH PASSWORD 'transitops_secret';
CREATE DATABASE transitops OWNER transitops;
\q
```

### 2. Configure environment

**Backend** — create `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://transitops:transitops_secret@localhost:5432/transitops
CORS_ORIGIN=http://localhost:3000
```

**Frontend** — create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a separate terminal)
cd frontend
npm install
```

### 4. Set up the database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed demo accounts (safe to re-run — upserts, no duplicates)
npm run seed
```

### 5. Start the servers

```bash
# Terminal 1 — Backend (with hot-reload)
cd backend
npm run dev

# Terminal 2 — Frontend (with hot-reload)
cd frontend
npm run dev
```

### 6. Access the app

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000   |
| Backend  | http://localhost:5000   |

> **Note:** The backend runs on port **5000** locally vs port **5001** when using Docker (because macOS AirPlay Receiver uses 5000, so Docker maps to 5001 on the host).

---

## Key Differences at a Glance

| Aspect | Docker | Local |
|---|---|---|
| **PostgreSQL** | Runs in a container automatically | You install & manage it yourself |
| **Dependencies** | Installed inside containers during build | You run `npm install` in each directory |
| **Prisma client** | Generated during Docker build | You run `npx prisma generate` manually |
| **Migrations** | `docker compose exec backend npx prisma migrate deploy` | `cd backend && npx prisma migrate deploy` |
| **Starting the app** | `docker compose up` (one command) | Run backend & frontend in separate terminals |
| **Hot-reload** | Not enabled (production build) | Enabled via `npm run dev` |
| **Backend URL** | `http://localhost:5001` | `http://localhost:5000` |
| **Stopping** | `docker compose down` | `Ctrl+C` in each terminal |

---

## Health Checks

```bash
# API status (adjust port: 5001 for Docker, 5000 for local)
curl http://localhost:5001

# Database connectivity
curl http://localhost:5001/api/health/db
```

---

## Auth & Roles

### Registration

- `POST /api/auth/register` is **public** but always creates the account as `DISPATCHER` (lowest privilege). The `role` field is not part of the request schema — if a client sends one anyway, it's silently ignored by Zod's default "strip unknown keys" behavior, not honored.
- Elevated roles (`FLEET_MANAGER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST`, `ADMIN`) can only be granted via `POST /api/admin/users`, which requires an authenticated `ADMIN` session (`authenticate` + `authorize("ADMIN")`). Admin-created accounts are marked `isEmailVerified: true` immediately (the admin creating them is the verification step); self-serve registrations still go through the OTP email flow.
- Admin UI for this lives at `/admin/users` — a minimal form (name, email, password, role) visible only to `ADMIN` accounts, both by nav visibility and a client-side role check on the page itself.
- ⚠️ **Contract change:** `POST /api/auth/register` no longer accepts/uses `role` in the request body. Anything that was relying on setting a role at registration needs to switch to `POST /api/admin/users`.

### Roles & permissions

- Role → permission mapping lives in **two mirrored files**, since the Express backend and Next.js frontend are separate deployables with no shared package:
  - `backend/src/config/permissions.js` — imported by route files (`authorize(...PERMISSIONS.someKey)`) instead of hardcoding role arrays inline.
  - `frontend/src/lib/permissions.ts` — the `PERMISSIONS` map, plus `NAV_ITEMS` (route → permission) and `permissionForPath()`. This one array is imported by both the nav (`AppShell`, for labels + filtering) and `proxy.ts` (for the route-level redirect check) — adding a new role-restricted route only needs a new `NAV_ITEMS` entry, not a new `proxy.ts` branch.
  - **Risk:** the backend and frontend files above are two *separate* files that must be hand-kept in sync (no shared package across the app boundary). If they drift, the nav/proxy could allow a route the API would 403 on, or block one it would actually allow. There is no automated check for this today. Within the frontend itself, though, `permissions.ts` is genuinely a single source of truth — nav and `proxy.ts` both import the same `NAV_ITEMS`/`PERMISSIONS`, no duplication there.
- `/settings` (view + update `OrgSettings`) is restricted to `FLEET_MANAGER` and `ADMIN`.
- `/admin/users` (create a user with any role) is restricted to `ADMIN`.
- `/dashboard`, `/analytics`, `/fuel-expenses`, `/vehicles`, `/drivers`, `/trips`, `/maintenance` are open to all 5 roles to *view*; each has a narrower `manageX` permission gating the actual create/edit/action buttons (see the Fleet Operations section below).
- **Enforcement layering:** `proxy.ts` verifies the JWT's signature (`jsonwebtoken`, same secret and algorithm the backend signs with — `JWT_SECRET` must be set identically in `frontend/.env.local`, never as `NEXT_PUBLIC_*`) and checks the token's `role` claim against `permissionForPath()` *before* any page renders. No token → redirect to `/login`. Invalid/expired token → redirect to `/login`. Valid token but wrong role → redirect to `/dashboard?denied=<path>`, which shows a toast and strips the query param. This is deliberately an *optimistic* check against the JWT claim alone — no DB lookup in proxy (Next.js explicitly recommends against slow work there). The real, authoritative enforcement is still the backend's `authorize()` middleware, which also checks `isActive`/`lockedUntil` against the database — so even a forged or replayed-but-otherwise-valid-looking token still gets rejected server-side if the account is deactivated or locked.

### Demo accounts

Seeded via `npm run seed` (backend), idempotent — safe to re-run. All accounts share the same password:

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@transitops.com` | `Password123!` |
| FLEET_MANAGER | `fleet.manager@transitops.com` | `Password123!` |
| DISPATCHER | `dispatcher@transitops.com` | `Password123!` |
| SAFETY_OFFICER | `safety.officer@transitops.com` | `Password123!` |
| FINANCIAL_ANALYST | `financial.analyst@transitops.com` | `Password123!` |

The seed script also creates 4 sample vehicles, 4 sample drivers, one **COMPLETED** trip lifecycle (Van-05 + Alex Rivera, 450kg cargo, 120km, ₹1800 fuel, ₹6000 revenue — the numbers from the spec's Section 5 example, verified end to end), and one vehicle (Mini-03) left `IN_SHOP` with an open maintenance log, so the dashboard/analytics aren't a blank slate. Re-running the seed script won't duplicate any of this or reset vehicle/driver status if it's since changed through real usage — see the comments in `backend/prisma/seed.js`.

---

## Fleet Operations API

Vehicle Registry, Driver Management, Trip Management, and Maintenance — built to close out the spec after Auth/RBAC/Settings, Dashboard, and Fuel & Expense/Analytics (all pre-existing). Same conventions throughout: `asyncHandler`/`ApiError`/`ApiResponse`, Zod validation via `backend/src/utils/validate.js`'s `parseOrThrow`, and every route reads its role list from the shared `PERMISSIONS` matrix.

### Vehicle Registry — `/api/vehicles`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/` | `vehicles` (all roles) | Filters: `type`, `status`, `region`. `?list=true` returns `{id, name, registrationNumber, status}` only — used by the Trip/Maintenance dropdowns. |
| POST | `/` | `manageVehicles` (FLEET_MANAGER, ADMIN) | 409 on duplicate `registrationNumber`. |
| GET | `/:id` | `vehicles` | |
| PUT | `/:id` | `manageVehicles` | |
| DELETE | `/:id` | `manageVehicles` | 409 if the vehicle has trip history — set status to `RETIRED` instead. |
| GET | `/:id/operational-cost` | any authenticated user | Pre-existing; unchanged. |

### Driver Management — `/api/drivers`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/` | `drivers` (all roles) | Filters: `status`, `licenseCategory`. `?list=true` for dropdowns. |
| POST | `/` | `manageDrivers` (FLEET_MANAGER, ADMIN, SAFETY_OFFICER) | 409 on duplicate `licenseNumber`. |
| GET / PUT / DELETE `/:id` | same pattern as vehicles | `manageDrivers` for write | DELETE is 409 if the driver has trip history. |

SAFETY_OFFICER is in `manageDrivers` because the spec asks them to manage compliance fields (license, safety score) — simplified to full record-edit access rather than field-level permissions; see judgment calls below.

### Trip Management — `/api/trips`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/` | `trips` (all roles) | Filters: `status`, `vehicleId`, `driverId`. |
| POST | `/` | `manageTrips` (DISPATCHER, ADMIN) | Creates as `DRAFT`. Validates vehicle status = `AVAILABLE`, driver status = `AVAILABLE` and not `SUSPENDED`, license not expired, `cargoWeightKg <= vehicle.maxLoadCapacityKg` — each with its own error message. |
| POST | `/:id/dispatch` | `manageTrips` | `DRAFT → DISPATCHED`. Re-validates vehicle/driver availability inside the transaction (closes the race where two drafts target the same resource), sets both to `ON_TRIP`. |
| POST | `/:id/complete` | `manageTrips` | `DISPATCHED → COMPLETED`. Body: `endOdometerKm`, `fuelConsumedLiters`, optional `fuelCost`/`revenue`. Restores vehicle/driver to `AVAILABLE`, updates `vehicle.odometerKm`, increments `driver.tripsCompletedCount`, creates a `FuelLog` so it flows into Fuel & Expense/Analytics automatically. |
| POST | `/:id/cancel` | `manageTrips` | Allowed from `DRAFT` or `DISPATCHED`. Only a `DISPATCHED` cancel restores vehicle/driver — a `DRAFT` never reserved them. |
| GET | `/:id` | `trips` | |

### Maintenance — `/api/maintenance-logs`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/` | `maintenance` (all roles) | Filters: `vehicleId`, `status`. |
| POST | `/` | `manageMaintenance` (FLEET_MANAGER, ADMIN) | Requires vehicle status = `AVAILABLE` (this single check also blocks a second open log and blocks `ON_TRIP`/`RETIRED` vehicles). Sets vehicle to `IN_SHOP`. **Also creates a matching `Expense` row** (type `MAINTENANCE`) — `getOperationalCost` and the analytics cost/ROI aggregates read `Expense`, not `MaintenanceLog.cost` directly, so this was necessary for the cost to actually show up anywhere. |
| POST | `/:id/close` | `manageMaintenance` | Restores vehicle to `AVAILABLE` — unless it was separately marked `RETIRED` while in the shop, in which case it stays `RETIRED`. |

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend:** Express 5, Prisma 7 (with `pg` adapter), Node.js 22
- **Database:** PostgreSQL 17
- **Containerization:** Docker, Docker Compose
