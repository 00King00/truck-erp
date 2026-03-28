# Truck ERP

A NestJS-based ERP REST API with a Vue 3 frontend dashboard. This is the **first module** of an extensible ERP system — responsible for managing **Truck** data with full CRUD, strict status transition rules, and a 100-record seeder for immediate usability.

**Live demo:** https://truck-erp.onrender.com
**Swagger UI:** https://truck-erp.onrender.com/swagger

> Note: The app is hosted on Render's free tier — the first request may take 30–60 seconds to wake up.

---

## Project Background

This project was built based on a technical specification ([PROJECT.md](PROJECT.md)). The full implementation plan, architectural decisions, and conventions are documented in [CLAUDE.md](CLAUDE.md) and [PLANNING.md](PLANNING.md). Development followed each milestone step-by-step from those files.

---

## Architecture & Design Decisions

### Why no authentication / login endpoint?

Authentication is intentionally **not implemented** in this module. The reasoning:

- This API is designed as **one module of a larger ERP system**, not a standalone app
- In a real-world setup, a **dedicated auth microservice** would handle login and issue JWT tokens
- Other modules (trucks, employees, factories, customers) receive that token and **verify it independently** using a shared `JWT_SECRET`
- This avoids duplicating auth logic across every module — each service only needs `@nestjs/jwt` to verify, not to issue

The `JwtAuthGuard` verifies the Bearer token on every request using `JWT_SECRET`. No Passport.js, no login route — just token verification.

### Extensibility

The structure is designed so future ERP modules follow the exact same pattern:

```
src/modules/
  trucks/       ← current
  employees/    ← future
  factories/    ← future
  customers/    ← future
```

Each module is self-contained: schema, DTOs, service, controller, constants, seeds.

### Frontend purpose

The Vue 3 dashboard was built **not as a production UI**, but as a convenient way to verify all API functionality without needing Postman or curl. It covers every endpoint — create, read, update, delete, filter, sort, paginate, and status transitions.

Please evaluate the frontend accordingly — its goal is functional completeness, not UI polish.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | NestJS |
| Language | TypeScript |
| Database | MongoDB (Mongoose) |
| Auth | JWT verification (`@nestjs/jwt`) |
| Validation | `class-validator` + `class-transformer` |
| API Docs | Swagger (`@nestjs/swagger`) at `/swagger` |
| Frontend | Vue 3 + Vite + TypeScript |
| UI Kit | PrimeVue (Aura theme) |
| HTTP Client | Axios + TanStack Vue Query |
| Containerization | Docker + Docker Compose |
| Database (prod) | MongoDB Atlas M0 |
| Hosting (prod) | Render Web Service |

---

## Quick Start (Docker)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/00King00/truck-erp.git
cd truck-erp

# 2. Copy and fill in environment variables
cp .env.example .env
```

```bash
# 3. Start everything
docker compose up
```

Open **http://localhost:3001** — the dashboard loads automatically. The DB seeds 100 trucks on first run.

That's it — just 3 steps.

> **Optional flags:** `docker compose up -d` runs in background, `--build` forces a rebuild after code changes. Not needed for a first run.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | yes | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | yes | Secret used to verify JWT tokens |
| `JWT_EXPIRES_IN` | no | Token expiry (default: `3600s`) |
| `PORT` | no | API port (default: `3000`) |
| `VITE_JWT_TOKEN` | yes | JWT token used by the frontend for all API requests |
| `VITE_API_URL` | no | API base URL; leave empty for same-origin (Docker) |

### Generating values for local use

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate VITE_JWT_TOKEN signed with that secret
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({ sub: 'admin' }, 'YOUR_SECRET', { expiresIn: '100y' }))"
```

### `.env.example`

```env
MONGODB_URI=mongodb://mongo:27017/truck-erp
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=3600s
PORT=3000
VITE_JWT_TOKEN=your-jwt-token-here
VITE_API_URL=
```

---

## Running Without Docker

```bash
# Backend
npm install
npm run start:dev       # API on http://localhost:3000

# Frontend (separate terminal)
cd client
npm install
npm run dev             # Vue on http://localhost:5173
```

For local dev without Docker, set `VITE_API_URL=http://localhost:3000` in `.env`.

---

## Running Tests

The Trucks module is covered with **unit tests** as a bonus — service, controller, guard, and exception filter are all tested.

```bash
npm run test          # run all unit tests
npm run test:cov      # with coverage report
```

Covered:
- `TrucksService` — all CRUD operations, all valid/invalid status transitions
- `TrucksController` — route delegation
- `JwtAuthGuard` — valid token, missing token, invalid token
- `HttpExceptionFilter` — all error shapes (400, 409, 422, 500)
- `TrucksModule` — provider resolution

> For a production-grade setup, integration tests and E2E tests (e.g. with Playwright) would be the natural next step — both are straightforward to add given the current structure.

---

## API Reference

All endpoints require `Authorization: Bearer <token>` header.

Base URL: `https://truck-erp.onrender.com/api`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/trucks` | Create a truck |
| `GET` | `/trucks` | List trucks (filter + sort + paginate) |
| `GET` | `/trucks/:id` | Get a single truck |
| `PATCH` | `/trucks/:id` | Update truck (incl. status change) |
| `DELETE` | `/trucks/:id` | Delete a truck |

### Query Parameters (GET /trucks)

| Param | Type | Description |
|-------|------|-------------|
| `code` | string | Partial match filter |
| `name` | string | Partial match filter |
| `status` | enum | Exact match filter |
| `description` | string | Partial match filter |
| `sortBy` | string | Field to sort by (default: `createdAt`) |
| `sortOrder` | `asc\|desc` | Sort direction (default: `desc`) |
| `page` | number | Page number (default: `1`) |
| `limit` | number | Items per page (default: `10`) |

### Truck Statuses & Transition Rules

```
Out Of Service ⟷ (any status)
Loading → To Job → At Job → Returning → Loading
```

Invalid transitions return `422 Unprocessable Entity`.

Full interactive docs: **https://truck-erp.onrender.com/swagger**

---

## Docker Architecture

A single container serves both the API and the frontend — no Nginx, no separate client container:

```
Dockerfile (multi-stage):
  Stage 1: build Vue → outputs to public/
  Stage 2: build NestJS → outputs to dist/
  Stage 3: production — NestJS serves dist/ + public/ via ServeStaticModule
```

```
docker-compose.yml:
  mongo  — port 27018:27017
  app    — port 3001:3000 (API + Vue static)
```
