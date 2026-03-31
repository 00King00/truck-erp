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
- **Docs:** Swagger UI via `@nestjs/swagger` — available at `/swagger`
- **Global prefix:** All REST endpoints are prefixed with `/api` (e.g. `/api/trucks`)

### Frontend (Vue 3)
- **Framework:** Vue 3 + Vite + TypeScript
- **State:** Pinia (minimal, no auth store)
- **Data fetching:** TanStack Vue Query
- **HTTP:** Axios — JWT token hardcoded via `VITE_JWT_TOKEN` env var, set in `client/.env`; `baseURL` includes `/api` prefix
- **UI kit:** PrimeVue (Aura theme)
- **Location:** `client/` directory in monorepo
- **No router** — single-page dashboard, `App.vue` renders `Dashboard.vue` directly

### Infrastructure
- **Local dev:** Docker Compose — one `app` container (NestJS + Vue static) + `mongo`
- **Serving frontend:** `ServeStaticModule` serves `public/` dir from NestJS — no Nginx, no separate container
- **Vue build output:** `client/vite.config.ts` sets `outDir: '../public'` and `envDir: '../'`
- **Single `.env`:** root `.env` covers both API vars (`MONGODB_URI`, `JWT_SECRET`) and client vars (`VITE_JWT_TOKEN`, `VITE_API_URL`)
- **Database (prod):** MongoDB Atlas M0 (free)
- **API + Frontend (prod):** Render Web Service (single Docker container)
- **Uptime:** UptimeRobot pings Render every 5 min to prevent sleep

## Project Structure
```
truck-erp/
├── src/                            # NestJS API
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/
│   │   ├── filters/                # Global exception filter
│   │   ├── guards/                 # JWT auth guard
│   │   └── utils/
│   │       └── create-model-provider.ts  # Generic custom provider factory
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
│           │   └── truck.schema.ts              # Mongoose schema + TruckDocument type
│           ├── models/
│           │   └── truck.model.ts               # TruckModel type + truckModelProvider
│           ├── dto/
│           │   ├── index.ts                     # Barrel export for all DTOs
│           │   ├── create-truck.dto.ts
│           │   ├── update-truck.dto.ts
│           │   └── query-truck.dto.ts
│           ├── seeds/
│           │   └── truck.seeder.ts             # Auto-seeds 100 trucks if DB empty
│           └── trucks.service.spec.ts
├── client/                         # Vue 3 dashboard
│   ├── src/
│   │   ├── api/
│   │   │   └── trucks.ts           # Axios instance (VITE_JWT_TOKEN from root .env)
│   │   ├── types/
│   │   │   └── truck.ts            # Truck types, TruckStatus const, VALID_TRANSITIONS
│   │   ├── components/
│   │   │   ├── TruckFormModal.vue  # Create / Edit modal (shared form)
│   │   │   └── StatusBadge.vue     # Colored status pill
│   │   ├── views/
│   │   │   └── Dashboard.vue       # Main view: table + filters + pagination
│   │   ├── App.vue                 # Renders Dashboard directly (no router)
│   │   └── main.ts
│   ├── vite.config.ts              # outDir: '../public', envDir: '../'
│   └── package.json
├── public/                         # Vue build output (gitignored)
├── Dockerfile                      # Multi-stage: build Vue → build NestJS → production
├── docker-compose.yml              # Local: mongo(27018) + app(3001)
└── .env.example                    # All vars: MONGODB_URI, JWT_SECRET, VITE_JWT_TOKEN, VITE_API_URL
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
- **Schemas** — Mongoose schema + `TruckDocument` type (`HydratedDocument<T>`); source of truth for document shape
- **Models** — `TruckModel` type alias + `truckModelProvider` custom provider; registered in module `providers[]`
- **DTOs** — request/response shapes with class-validator + swagger decorators; exported via `dto/index.ts` barrel
- **Guards** — global `JwtAuthGuard` validates Bearer token
- **Filters/Pipes** — global `HttpExceptionFilter`, global `ValidationPipe`
- **Seeds** — `SeederService` runs on `onModuleInit`, inserts 100 trucks if collection is empty

**Auth assumption:** JWT tokens are issued by an external auth service. This module only verifies the signature using `JWT_SECRET` from `.env`.

### Custom Model Provider Pattern

Instead of `MongooseModule.forFeature()` + `@InjectModel()`, this project uses a custom provider factory:

```ts
// src/common/utils/create-model-provider.ts
export function createModelProvider<TDocument>(cls: { name: string }, schema: Schema) {
  return {
    provide: `${cls.name}Model`,        // e.g. 'TruckModel'
    useFactory: (connection: Connection) => connection.model<TDocument>(cls.name, schema),
    inject: [getConnectionToken()],
  };
}
```

**Each module defines its model in `models/<entity>.model.ts`:**
```ts
export type TruckModel = Model<TruckDocument>;
export const truckModelProvider = createModelProvider<TruckDocument>(Truck, TruckSchema);
```

**Module registers the provider directly (no `MongooseModule.forFeature`):**
```ts
providers: [truckModelProvider, TrucksService, TruckSeederService]
```

**Services inject via string token:**
```ts
@Inject('TruckModel') private readonly truckModel: TruckModel
```

**Why this pattern:**
- **Inversion of control** — service depends on token `'TruckModel'`, not on Mongoose-specific `@InjectModel`
- **Easier testing** — mock with `{ provide: 'TruckModel', useValue: mockModel }`, no Mongoose setup needed
- **Framework isolation** — swapping Mongoose for another ODM only touches `model.ts`, not the service
- **DRY** — `createModelProvider` eliminates boilerplate for every future module (Customer, Employee, etc.)
- **Auto-token** — token `'TruckModel'` is derived from `Truck.name` automatically; no magic strings to maintain

**Rule:** `TruckDocument` stays in `schemas/` (it describes the Mongoose document shape). `TruckModel` type and provider live in `models/`.

### Frontend
- JWT token set once in `client/.env` as `VITE_JWT_TOKEN` — picked up by axios at build time
- No login screen, no router — `App.vue` renders `Dashboard.vue` directly
- Status transition rules mirrored on client side (`VALID_TRANSITIONS` in `types/truck.ts`) to disable invalid options in status dropdown
- Loading spinner shown on cold start (Render wakeup delay)

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
- DTOs must use `class-validator` + `@ApiProperty` decorators; always export via `dto/index.ts` barrel
- Services throw NestJS `HttpException` subclasses (`NotFoundException`, `ConflictException`, `UnprocessableEntityException`)
- No business logic in controllers
- Domain constants (transition maps, enums data) go in `constants/`, not inlined in service files
- All routes protected by `JwtAuthGuard` globally
- Never use `MongooseModule.forFeature()` or `@InjectModel()` — use `createModelProvider` + `@Inject('XxxModel')` pattern (see Custom Model Provider Pattern above)

## API Reference

### Trucks
| Method | Path              | Description                        |
|--------|-------------------|------------------------------------|
| POST   | /api/trucks       | Create a truck                     |
| GET    | /api/trucks       | List trucks (filter + sort + page) |
| GET    | /api/trucks/:id   | Get single truck                   |
| PATCH  | /api/trucks/:id   | Update truck (incl. status change) |
| DELETE | /api/trucks/:id   | Delete truck                       |

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
