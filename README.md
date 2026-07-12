# TransitOps — Smart Transport Operations Platform

A comprehensive, full-stack fleet management platform built to streamline logistics, dispatch, and cost tracking.

**Tech Stack:** 
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend:** Express 5, Prisma 7 (with `pg` adapter), Node.js 22
- **Database:** PostgreSQL 17
- **Containerization:** Docker, Docker Compose

---

## 🚀 Features

- **Role-Based Access Control (RBAC):** 5 distinct roles (`ADMIN`, `FLEET_MANAGER`, `DISPATCHER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST`), each with tailored permissions and restricted views.
- **Live Dashboard:** Real-time metrics on fleet utilization, active trips, and vehicle status.
- **Fleet & Driver Management:** Complete CRUD operations for vehicles and drivers, tracking specifications, licenses, and availability statuses.
- **Trip Dispatching:** End-to-end trip lifecycle tracking (Draft → Dispatched → Completed/Canceled).
- **Maintenance Tracking:** Proactive health logging for vehicles, automatically transitioning them to `IN_SHOP` and generating associated maintenance costs.
- **Financial Oversight:** Detailed tracking of fuel consumption and operational expenses, providing a clear picture of total operational cost.

> **Note for Evaluators:** A complete script for demoing these features is available in [`demo_script.md`](./demo_script.md).

---

## 🛠️ Prerequisites & Setup

Choose **one** of the two setup paths below:

| | Docker Setup (Recommended) | Local Setup |
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

## 🩺 Health Checks

```bash
# API status (adjust port: 5001 for Docker, 5000 for local)
curl http://localhost:5001

# Database connectivity
curl http://localhost:5001/api/health/db
```

---

## 🔐 Auth & Roles

### Registration

- `POST /api/auth/register` is **public** but always creates the account as `DISPATCHER` (lowest privilege). The `role` field is not part of the request schema.
- Elevated roles (`FLEET_MANAGER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST`, `ADMIN`) can only be granted via `POST /api/admin/users`, which requires an authenticated `ADMIN` session. Admin-created accounts are marked `isEmailVerified: true` immediately.
- Admin UI for this lives at `/admin/users` — a minimal form visible only to `ADMIN` accounts.

### Demo Accounts

Seeded via `npm run seed` (backend), idempotent — safe to re-run. All accounts share the same password: `Password123!`

| Role | Email |
|---|---|
| ADMIN | `admin@transitops.com` |
| FLEET_MANAGER | `fleet.manager@transitops.com` |
| DISPATCHER | `dispatcher@transitops.com` |
| SAFETY_OFFICER | `safety.officer@transitops.com` |
| FINANCIAL_ANALYST | `financial.analyst@transitops.com` |

The seed script also creates sample vehicles, drivers, a completed trip lifecycle, and a vehicle left `IN_SHOP` so the dashboard and analytics aren't a blank slate.

---

## 🚛 Fleet Operations API

Vehicle Registry, Driver Management, Trip Management, and Maintenance. Built with `asyncHandler`/`ApiError`/`ApiResponse` and Zod validation.

### Vehicle Registry — `/api/vehicles`
- `GET /` — Open to all roles. Filters available.
- `POST /` — `FLEET_MANAGER`, `ADMIN`.
- `DELETE /:id` — `FLEET_MANAGER`, `ADMIN`. Fails with 409 if vehicle has trip history (set to `RETIRED` instead).

### Driver Management — `/api/drivers`
- `GET /` — Open to all roles.
- `POST /` & `PUT /:id` — `FLEET_MANAGER`, `ADMIN`, `SAFETY_OFFICER`. Safety officers manage compliance fields.

### Trip Management — `/api/trips`
- `POST /` — Creates a `DRAFT` trip. Checks vehicle/driver availability.
- `POST /:id/dispatch` — Transitions `DRAFT → DISPATCHED`. Reserves the driver and vehicle (`ON_TRIP`).
- `POST /:id/complete` — Transitions `DISPATCHED → COMPLETED`. Restores availability, updates odometers, increments completed trips, and creates a `FuelLog`.
- `POST /:id/cancel` — Restores vehicle/driver to `AVAILABLE` (if they were dispatched).

### Maintenance — `/api/maintenance-logs`
- `POST /` — Creates a maintenance log. Requires vehicle to be `AVAILABLE`, then sets it to `IN_SHOP`. **Automatically creates a matching `Expense` row** (type `MAINTENANCE`) so costs flow into financial reporting.
- `POST /:id/close` — Restores the vehicle to `AVAILABLE`.
