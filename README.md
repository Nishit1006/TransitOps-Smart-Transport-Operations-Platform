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
- **Why this shape and not a full "admin create user" screen:** the fix prioritized closing the privilege-escalation hole and standing up the API contract correctly. There's no admin UI for user creation yet — use `POST /api/admin/users` directly (curl/Postman) until that screen is built.
- ⚠️ **Contract change:** `POST /api/auth/register` no longer accepts/uses `role` in the request body. Anything that was relying on setting a role at registration needs to switch to `POST /api/admin/users`.

### Demo accounts

Seeded via `npm run seed` (backend), idempotent — safe to re-run. All accounts share the same password:

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@transitops.com` | `Password123!` |
| FLEET_MANAGER | `fleet.manager@transitops.com` | `Password123!` |
| DISPATCHER | `dispatcher@transitops.com` | `Password123!` |
| SAFETY_OFFICER | `safety.officer@transitops.com` | `Password123!` |
| FINANCIAL_ANALYST | `financial.analyst@transitops.com` | `Password123!` |

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend:** Express 5, Prisma 7 (with `pg` adapter), Node.js 22
- **Database:** PostgreSQL 17
- **Containerization:** Docker, Docker Compose
