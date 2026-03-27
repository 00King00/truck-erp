# Truck ERP

## Overview
A NestJS-based ERP REST API with a Vue 3 frontend dashboard. Starts with a Truck management module — full CRUD, strict status transition rules, 100-record seeder, and a dashboard UI for end-to-end testing. Designed to be extended with future ERP modules (employees, factories, customers, etc.).

## Tech Stack

### Backend (NestJS)
- **Runtime:** Node.js
- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** MongoDB
- **ODM:** Mongoose (`@nestjs/mongoose`)
- **Validation:** `class-validator` + `class-transformer` (NestJS pipes)
- **Auth:** JWT verification only (`@nestjs/jwt`) — no login endpoint, token issued by external auth service; guard verifies token manually via `JwtService.verify()`; no Passport.js
- **Testing:** Jest (unit tests only)
- **API Style:** REST
- **Docs:** Swagger UI via `@nestjs/swagger` — available at `/api`

### Frontend (Vue 3)
- **Framework:** Vue 3 + Vite + TypeScript
- **State:** Pinia
- **Data fetching:** TanStack Vue Query
- **HTTP:** Axios with Bearer token interceptor
- **UI kit:** PrimeVue
- **Location:** `client/` directory in monorepo

### Infrastructure
- **Local dev:** Docker Compose (all services in one command)
- **Database (prod):** MongoDB Atlas M0 (free)
- **API (prod):** Render Web Service (Docker)
- **Frontend (prod):** Cloudflare Pages (root: `client/`)
- **Uptime:** UptimeRobot pings Render every 5 min to prevent sleep

## Project Structure
```
truck-erp/
├── src/                            # NestJS API
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/
│   │   ├── filters/                # Global exception filter
│   │   └── guards/                 # JWT auth guard
│   ├── config/
│   │   └── configuration.ts        # Config factory (env vars)
│   ├── auth/
│   │   └── auth.module.ts
│   └── modules/
│       └── trucks/
│           ├── trucks.module.ts
│           ├── trucks.controller.ts
│           ├── trucks.service.ts
│           ├── constants/
│           │   └── truck-status-transitions.ts  # VALID_TRANSITIONS map
│           ├── enums/
│           │   └── truck-status.enum.ts
│           ├── schemas/
│           │   └── truck.schema.ts
│           ├── dto/
│           │   ├── create-truck.dto.ts
│           │   ├── update-truck.dto.ts
│           │   └── query-truck.dto.ts
│           ├── seeds/
│           │   └── truck.seeder.ts             # Auto-seeds 100 trucks if DB empty
│           └── trucks.service.spec.ts
├── client/                         # Vue 3 dashboard
│   ├── src/
│   │   ├── api/
│   │   │   └── trucks.ts           # Axios calls
│   │   ├── stores/
│   │   │   └── auth.ts             # JWT token (localStorage)
│   │   ├── components/
│   │   │   ├── TruckTable.vue
│   │   │   ├── TruckFormModal.vue
│   │   │   └── StatusBadge.vue
│   │   └── views/
│   │       └── Dashboard.vue
│   ├── Dockerfile                  # Nginx + Vue build
│   ├── nginx.conf
│   └── package.json
├── Dockerfile                      # NestJS API (multi-stage)
├── docker-compose.yml              # Local: mongo(27018) + api(3001) + client(8080)
└── .env.example
```

## Architecture

### Backend
```
Request → JwtAuthGuard → Controller → Service → Repository (Mongoose Model) → MongoDB
```

- **Controllers** — handle HTTP, parse DTOs, return responses
- **Services** — business logic, status transition validation
- **Constants** — domain constants (e.g. `VALID_TRANSITIONS`) live in `constants/`, not inside service files
- **Schemas** — Mongoose schema/model definitions
- **DTOs** — request/response shapes with class-validator + swagger decorators
- **Guards** — global `JwtAuthGuard` validates Bearer token
- **Filters/Pipes** — global `HttpExceptionFilter`, global `ValidationPipe`
- **Seeds** — `SeederService` runs on `onModuleInit`, inserts 100 trucks if collection is empty

**Auth assumption:** JWT tokens are issued by an external auth service. This module only verifies the signature using `JWT_SECRET` from `.env`.

### Frontend
- JWT token entered once by user on first visit, stored in `localStorage`
- All API calls go through axios interceptor that attaches `Authorization: Bearer <token>`
- Status transition rules mirrored on client side to disable invalid options in UI
- Loading skeleton shown on cold start (Render wakeup delay)

## Key Domain Concepts

### Truck Entity
| Field       | Type   | Required | Notes                            |
|-------------|--------|----------|----------------------------------|
| code        | string | yes      | Unique, alphanumeric             |
| name        | string | yes      |                                  |
| status      | enum   | yes      | One of the 5 statuses below      |
| description | string | no       | Optional free text               |

### Truck Statuses (enum)
```
Out Of Service | Loading | To Job | At Job | Returning
```

### Status Transition Rules
- `Out Of Service` can always be set from any status
- Any status can be set from `Out Of Service`
- The ordered cycle must be followed: `Loading → To Job → At Job → Returning`
- `Returning → Loading` is allowed (cycle restarts)

```
Out Of Service ⟷ (any status)
Loading → To Job → At Job → Returning → Loading
```

Invalid transitions must be rejected with `422 Unprocessable Entity` on backend.
Invalid transition options must be visually disabled in the frontend dropdown.

## Development Guidelines

### Running locally (Docker)
```bash
docker compose up         # starts mongo + api + client
# open http://localhost:8080
```

### Running locally (without Docker)
```bash
npm install
npm run start:dev         # API on :3000
cd client && npm install && npm run dev   # Vue on :5173
```

### Environment variables
```
MONGODB_URI=mongodb://localhost:27017/truck-erp
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=3600s
PORT=3000
```

### Running tests
```bash
npm run test          # unit tests
npm run test:cov      # with coverage
```

### Code conventions
- Use `async/await`, never raw callbacks
- DTOs must use `class-validator` + `@ApiProperty` decorators
- Services throw NestJS `HttpException` subclasses (`NotFoundException`, `ConflictException`, `UnprocessableEntityException`)
- No business logic in controllers
- Domain constants (transition maps, enums data) go in `constants/`, not inlined in service files
- All routes protected by `JwtAuthGuard` globally

## API Reference

### Trucks
| Method | Path          | Description                        |
|--------|---------------|------------------------------------|
| POST   | /trucks       | Create a truck                     |
| GET    | /trucks       | List trucks (filter + sort + page) |
| GET    | /trucks/:id   | Get single truck                   |
| PATCH  | /trucks/:id   | Update truck (incl. status change) |
| DELETE | /trucks/:id   | Delete truck                       |

#### List query params
| Param       | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| code        | string    | Filter by code (partial match)       |
| name        | string    | Filter by name (partial match)       |
| status      | enum      | Filter by exact status               |
| description | string    | Filter by description (partial)      |
| sortBy      | string    | Field to sort by (default: createdAt)|
| sortOrder   | asc\|desc | Sort direction (default: desc)       |
| page        | number    | Page number (default: 1)             |
| limit       | number    | Items per page (default: 10)         |

## Important Constraints
- `code` must be unique — return `409 Conflict` on duplicate
- Status transitions validated on every PATCH with `status` — return `422` for invalid
- Transition logic lives in `TrucksService` only, never in controller or schema
- `VALID_TRANSITIONS` map lives in `constants/truck-status-transitions.ts`, not in service file
- Seeder is idempotent — only runs when collection is empty, never overwrites data
- Future ERP modules follow the same structure under `src/modules/`
