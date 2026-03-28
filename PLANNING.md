# Implementation Plan

## How to use this file
Check off steps as you complete them (`[ ]` → `[x]`). Each milestone is independently testable. Work through them in order — later milestones depend on earlier ones.

---

## Milestone 1: Project Scaffolding, Configuration & Auth Guard
**Goal:** Get a running NestJS app with MongoDB connected, JWT verification wired up globally, and global pipes set up. No login endpoint — auth is handled by an external service; this module only verifies tokens.

### Steps
- [x] Initialize NestJS project (`nest new truck-erp` or verify existing scaffold)
  > **Note**: Scaffolded in `/tmp` to avoid README.md conflict, then copied with rsync excluding README.md. Also removed unused scaffold files: `app.controller.ts`, `app.service.ts`, `app.controller.spec.ts`.
- [x] Install dependencies: `@nestjs/mongoose mongoose`, `@nestjs/jwt`, `class-validator class-transformer`, `@nestjs/config`
- [x] Create `src/config/configuration.ts` — export config factory reading env vars (`MONGODB_URI`, `JWT_SECRET`, `PORT`)
- [x] Create `.env.example` with all required env var names (no values)
- [x] Wire `ConfigModule` (global) and `MongooseModule` in `AppModule`
- [x] Create `src/auth/auth.module.ts` — registers `JwtModule` with `JWT_SECRET` from config; exports `JwtModule`
- [x] Create `src/common/guards/jwt-auth.guard.ts` — implements `CanActivate`; extracts Bearer token from `Authorization` header; calls `JwtService.verify()`; throws `UnauthorizedException` on failure
- [x] Apply `JwtAuthGuard` globally via `APP_GUARD` in `AppModule`
- [x] Set up global `ValidationPipe` in `main.ts` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`)
- [x] Verify app starts and connects to MongoDB without errors

**Milestone complete when:** `npm run start:dev` boots cleanly, MongoDB connection is logged, and requests without a valid JWT return 401.

---

## Milestone 2: Truck Schema & DTOs
**Goal:** Define the Mongoose schema and all request/response DTOs with validation.

### Steps
- [x] Create `TruckStatus` enum at `src/modules/trucks/enums/truck-status.enum.ts`
- [x] Create Mongoose schema `src/modules/trucks/schemas/truck.schema.ts`:
  - Fields: `code` (unique), `name`, `status`, `description` (optional)
  - Add timestamps (`createdAt`, `updatedAt`)
- [x] Create `CreateTruckDto` with `class-validator` decorators
- [x] Create `UpdateTruckDto` (all fields optional via `PartialType`)
- [x] Create `QueryTruckDto` for filtering/sorting/pagination query params:
  - Optional: `code`, `name`, `status`, `description`, `sortBy`, `sortOrder`, `page`, `limit`
  - Validate `sortOrder` is `asc | desc`, `page`/`limit` are positive integers

**Milestone complete when:** DTOs correctly reject invalid payloads when tested manually or via unit tests.

---

## Milestone 3: Trucks Service & Status Transition Logic
**Goal:** Core business logic — CRUD operations and status transition enforcement.

### Steps
- [x] Create `TrucksModule` and `TrucksService` at `src/modules/trucks/`
- [x] Implement `create()` — insert truck, handle duplicate `code` with `ConflictException`
- [x] Implement `findAll()` — build a dynamic Mongoose query from `QueryTruckDto`:
  - Partial string match (regex) for `code`, `name`, `description`
  - Exact match for `status`
  - Dynamic `sort()` from `sortBy` + `sortOrder`
  - Pagination via `skip()` + `limit()`
- [x] Implement `findOne()` — find by MongoDB `_id`, throw `NotFoundException` if missing
- [x] Implement `update()`:
  - Find existing truck
  - If `status` is being changed, validate transition using the rules from CLAUDE.md
  - Throw `UnprocessableEntityException` for invalid transitions
  - Save and return updated truck
- [x] Implement `remove()` — find and delete, throw `NotFoundException` if missing
- [x] Encapsulate status transition logic in a private `isValidTransition(from, to)` method
- [x] Write unit tests for `TrucksService`:
  - All valid status transitions pass
  - All invalid transitions throw `UnprocessableEntityException`
  - Duplicate `code` throws `ConflictException`
  - `findOne` / `remove` with unknown id throws `NotFoundException`

**Milestone complete when:** All unit tests pass (`npm run test`).

---

## Milestone 4: Trucks Controller & Route Wiring
**Goal:** Expose all truck endpoints via HTTP and wire up the full module.

### Steps
- [x] Create `TrucksController` with all 5 routes (POST, GET list, GET one, PATCH, DELETE)
- [x] Use `@Query()`, `@Param()`, `@Body()` decorators with the correct DTOs
- [x] Apply `JwtAuthGuard` to the controller (if not already global)
- [x] Register `TrucksModule` in `AppModule`
- [x] Return appropriate HTTP status codes (`201` for create, `200` for others, `204` for delete)
- [ ] Manual smoke test all endpoints with a REST client (e.g., curl or Postman)

**Milestone complete when:** All 5 endpoints respond correctly; auth is enforced; filtering, sorting, and pagination work on the list endpoint.

---

## Milestone 5: Error Handling & Polish
**Goal:** Consistent error responses and production-readiness polish.

### Steps
- [x] Create a global `HttpExceptionFilter` that formats all errors as `{ statusCode, message, error }`
- [x] Register the filter globally in `main.ts`
- [x] Ensure Mongoose `CastError` (invalid ObjectId) is caught and returned as `400 Bad Request`
- [x] Ensure duplicate key errors from MongoDB (code 11000) surface as `409 Conflict`
- [x] Add `@ApiProperty()` decorators to DTOs and enable Swagger (`@nestjs/swagger`) — optional but recommended
  > **Note**: Installed `@nestjs/swagger`, added `@ApiProperty`/`@ApiPropertyOptional` to all DTOs, `@ApiTags`/`@ApiBearerAuth` to controller; Swagger UI available at `/api`.
- [x] Review and clean up any `any` types
  > **Note**: Replaced `Record<string, any>` with `Record<string, unknown>` in `trucks.service.ts`.

**Milestone complete when:** Invalid ObjectIds return 400, duplicate codes return 409, all other errors return consistent JSON shapes.

---

## Milestone 6: Database Seeder
**Goal:** On startup, if the DB is empty — auto-insert 100 generated trucks with varied statuses so the app is immediately usable for demo and testing.

### Steps
- [x] Create `src/modules/trucks/seeds/truck.seeder.ts` — `SeederService` that checks `count() === 0` and inserts generated data
- [x] Generate 100 trucks programmatically: random realistic names, unique codes (e.g. `TRK001`–`TRK100`), evenly distributed statuses, some with descriptions
- [x] Register `SeederService` in `TrucksModule` and call it from `onModuleInit` lifecycle hook
- [x] Seeder must be idempotent — runs only when collection is empty, never overwrites existing data

**Milestone complete when:** Fresh `docker compose up` → API starts → DB has 100 trucks automatically.

---

## Milestone 7: Vue 3 Dashboard (client/)
**Goal:** A fully functional frontend dashboard that covers all API operations — acts as both a UI and an end-to-end verification of all endpoints.

### Steps
- [x] Scaffold Vue 3 + Vite + TypeScript app in `client/`
- [x] Install dependencies: `pinia`, `@tanstack/vue-query`, `axios`, `vue-router`
- [x] Choose and install UI kit: **PrimeVue** (table, dialog, toast, dropdown built-in)
- [x] Create `client/src/api/trucks.ts` — axios instance with Bearer token interceptor
- [x] Create JWT input screen — user pastes token once, stored in `localStorage`, used for all requests
- [x] Implement `TruckTable` — paginated table with columns: code, name, status (badge), description, actions
- [x] Implement filters bar: code (text), name (text), status (dropdown), with sort order select
- [x] Implement sortable columns (sortBy + sortOrder query params)
- [x] Implement `TruckFormModal` — Create / Edit truck (shared form, mode-aware)
- [x] Implement Delete confirmation dialog
- [x] Implement status change dropdown in table row — disabled options for invalid transitions (client-side rules mirror backend)
- [x] Show loading spinner while API is waking up (cold start UX)
- [x] Show toast notifications for success/error on every mutation
- [x] Updated `findAll` in `TrucksService` to return `{ data, total, page, limit }` for pagination support
- [x] Excluded `client/` from NestJS `tsconfig.build.json` to avoid cross-project TS errors
- [x] Used `const` object + type alias instead of `enum` in `client/src/types/truck.ts` — required by `erasableSyntaxOnly: true` in Vue tsconfig

**Milestone complete when:** All 5 endpoints exercised through the UI; filtering, sorting, pagination, create, edit, delete, status change all work.

---

## Milestone 8: Docker Setup
**Goal:** Single `docker compose up` starts everything locally. One container serves both API and Vue frontend — NestJS builds Vue as static files and serves them via `ServeStaticModule`. No Nginx, no separate client container.

### Steps
- [ ] Configure `client/vite.config.ts` — set `outDir: '../public'` and `envDir: '../'` so Vue builds into repo root and reads `.env` from root
- [ ] Install `@nestjs/serve-static` and register `ServeStaticModule` in `AppModule` — serve `public/` dir, exclude `/trucks*` and `/api*`
- [ ] Update root `.env.example` — add `VITE_JWT_TOKEN` and `VITE_API_URL` (single `.env` for both API and client)
- [ ] Create multi-stage `Dockerfile`:
  - Stage 1: build Vue (`node:22-alpine`, `npm run build` in `client/`) → outputs to `public/`
  - Stage 2: build NestJS (`npm run build`) → outputs to `dist/`
  - Stage 3: production image — copy `dist/`, `public/`, `node_modules/`, run `node dist/main`
- [ ] Create `docker-compose.yml`:
  - `mongo` on port `27018:27017` (avoids conflict with existing local MongoDB)
  - `app` on port `3001:3000` (API + Vue in one container)
  - `app` depends on `mongo` with healthcheck
- [ ] Verify `docker compose up` → open `localhost:3001` → dashboard loads, all API calls work

**Milestone complete when:** `git clone → cp .env.example .env → docker compose up → localhost:3001` works with zero manual configuration.

---

## Milestone 9: Deployment
**Goal:** Live deployment accessible via public URLs.

### Steps
- [ ] Create MongoDB Atlas M0 cluster (free, no card) — get `MONGODB_URI`
- [ ] Deploy to Render (Web Service, Docker) — set `MONGODB_URI`, `JWT_SECRET`, `PORT`, `VITE_JWT_TOKEN`, `VITE_API_URL` env vars
- [ ] Set up UptimeRobot — monitor Render URL every 5 min to prevent sleep
- [ ] Verify full flow on production URL

**Milestone complete when:** Public URL opens dashboard, all operations work against Atlas DB.
