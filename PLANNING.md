# Implementation Plan

## How to use this file
Check off steps as you complete them (`[ ]` → `[x]`). Each milestone is independently testable. Work through them in order — later milestones depend on earlier ones.

---

## Milestone 1: Project Scaffolding, Configuration & Auth Guard
**Goal:** Get a running NestJS app with MongoDB connected, JWT verification wired up globally, and global pipes set up. No login endpoint — auth is handled by an external service; this module only verifies tokens.

### Steps
- [ ] Initialize NestJS project (`nest new truck-erp` or verify existing scaffold)
- [ ] Install dependencies: `@nestjs/mongoose mongoose`, `@nestjs/jwt`, `class-validator class-transformer`, `@nestjs/config`
- [ ] Create `src/config/configuration.ts` — export config factory reading env vars (`MONGODB_URI`, `JWT_SECRET`, `PORT`)
- [ ] Create `.env.example` with all required env var names (no values)
- [ ] Wire `ConfigModule` (global) and `MongooseModule` in `AppModule`
- [ ] Create `src/auth/auth.module.ts` — registers `JwtModule` with `JWT_SECRET` from config; exports `JwtModule`
- [ ] Create `src/common/guards/jwt-auth.guard.ts` — implements `CanActivate`; extracts Bearer token from `Authorization` header; calls `JwtService.verify()`; throws `UnauthorizedException` on failure
- [ ] Apply `JwtAuthGuard` globally via `APP_GUARD` in `AppModule`
- [ ] Set up global `ValidationPipe` in `main.ts` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`)
- [ ] Verify app starts and connects to MongoDB without errors

**Milestone complete when:** `npm run start:dev` boots cleanly, MongoDB connection is logged, and requests without a valid JWT return 401.

---

## Milestone 2: Truck Schema & DTOs
**Goal:** Define the Mongoose schema and all request/response DTOs with validation.

### Steps
- [ ] Create `TruckStatus` enum at `src/modules/trucks/enums/truck-status.enum.ts`
- [ ] Create Mongoose schema `src/modules/trucks/schemas/truck.schema.ts`:
  - Fields: `code` (unique), `name`, `status`, `description` (optional)
  - Add timestamps (`createdAt`, `updatedAt`)
- [ ] Create `CreateTruckDto` with `class-validator` decorators
- [ ] Create `UpdateTruckDto` (all fields optional via `PartialType`)
- [ ] Create `QueryTruckDto` for filtering/sorting/pagination query params:
  - Optional: `code`, `name`, `status`, `description`, `sortBy`, `sortOrder`, `page`, `limit`
  - Validate `sortOrder` is `asc | desc`, `page`/`limit` are positive integers

**Milestone complete when:** DTOs correctly reject invalid payloads when tested manually or via unit tests.

---

## Milestone 3: Trucks Service & Status Transition Logic
**Goal:** Core business logic — CRUD operations and status transition enforcement.

### Steps
- [ ] Create `TrucksModule` and `TrucksService` at `src/modules/trucks/`
- [ ] Implement `create()` — insert truck, handle duplicate `code` with `ConflictException`
- [ ] Implement `findAll()` — build a dynamic Mongoose query from `QueryTruckDto`:
  - Partial string match (regex) for `code`, `name`, `description`
  - Exact match for `status`
  - Dynamic `sort()` from `sortBy` + `sortOrder`
  - Pagination via `skip()` + `limit()`
- [ ] Implement `findOne()` — find by MongoDB `_id`, throw `NotFoundException` if missing
- [ ] Implement `update()`:
  - Find existing truck
  - If `status` is being changed, validate transition using the rules from CLAUDE.md
  - Throw `UnprocessableEntityException` for invalid transitions
  - Save and return updated truck
- [ ] Implement `remove()` — find and delete, throw `NotFoundException` if missing
- [ ] Encapsulate status transition logic in a private `isValidTransition(from, to)` method
- [ ] Write unit tests for `TrucksService`:
  - All valid status transitions pass
  - All invalid transitions throw `UnprocessableEntityException`
  - Duplicate `code` throws `ConflictException`
  - `findOne` / `remove` with unknown id throws `NotFoundException`

**Milestone complete when:** All unit tests pass (`npm run test`).

---

## Milestone 4: Trucks Controller & Route Wiring
**Goal:** Expose all truck endpoints via HTTP and wire up the full module.

### Steps
- [ ] Create `TrucksController` with all 5 routes (POST, GET list, GET one, PATCH, DELETE)
- [ ] Use `@Query()`, `@Param()`, `@Body()` decorators with the correct DTOs
- [ ] Apply `JwtAuthGuard` to the controller (if not already global)
- [ ] Register `TrucksModule` in `AppModule`
- [ ] Return appropriate HTTP status codes (`201` for create, `200` for others, `204` for delete)
- [ ] Manual smoke test all endpoints with a REST client (e.g., curl or Postman)

**Milestone complete when:** All 5 endpoints respond correctly; auth is enforced; filtering, sorting, and pagination work on the list endpoint.

---

## Milestone 5: Error Handling & Polish
**Goal:** Consistent error responses and production-readiness polish.

### Steps
- [ ] Create a global `HttpExceptionFilter` that formats all errors as `{ statusCode, message, error }`
- [ ] Register the filter globally in `main.ts`
- [ ] Ensure Mongoose `CastError` (invalid ObjectId) is caught and returned as `400 Bad Request`
- [ ] Ensure duplicate key errors from MongoDB (code 11000) surface as `409 Conflict`
- [ ] Add `@ApiProperty()` decorators to DTOs and enable Swagger (`@nestjs/swagger`) — optional but recommended
- [ ] Review and clean up any `any` types

**Milestone complete when:** Invalid ObjectIds return 400, duplicate codes return 409, all other errors return consistent JSON shapes.
