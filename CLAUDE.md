# Truck ERP

## Overview
A NestJS-based ERP REST API starting with a Truck management module. It supports full CRUD operations on trucks, enforces strict status transition rules, and is designed to be extended with future ERP modules (employees, factories, customers, etc.).

## Tech Stack
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

## Architecture
Layered architecture inside NestJS modules:

```
Request → JwtAuthGuard → Controller → Service → Repository (Mongoose Model) → MongoDB
```

- **Controllers** — handle HTTP, parse DTOs, return responses
- **Services** — business logic, status transition validation
- **Schemas** — Mongoose schema/model definitions
- **DTOs** — request/response shapes with class-validator decorators
- **Guards** — global `JwtAuthGuard` validates Bearer token using shared `JWT_SECRET`; no login/signup here
- **Filters/Pipes** — global validation pipe, exception filter

**Auth assumption:** This service is one module in a larger system. Authentication (login, token issuance) is handled by a separate auth service/microservice. This module only verifies the JWT signature using the shared `JWT_SECRET` from `.env`. No user management, no login endpoint.

Each domain (trucks, future modules) lives in its own NestJS feature module under `src/modules/`.

## Project Structure
```
src/
├── app.module.ts               # Root module
├── main.ts                     # Bootstrap
├── common/
│   ├── filters/                # Global exception filters
│   └── guards/                 # JWT auth guard (verify-only, no login)
├── config/
│   └── configuration.ts        # Config factory (env vars)
├── auth/
│   └── auth.module.ts          # Registers JwtModule (secret from config)
└── modules/
    └── trucks/
        ├── trucks.module.ts
        ├── trucks.controller.ts
        ├── trucks.service.ts
        ├── schemas/
        │   └── truck.schema.ts
        ├── dto/
        │   ├── create-truck.dto.ts
        │   ├── update-truck.dto.ts
        │   └── query-truck.dto.ts
        └── trucks.service.spec.ts
```

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

**Diagram:**
```
Out Of Service ⟷ (any status)
Loading → To Job → At Job → Returning → Loading
```

Invalid transitions (e.g., `Loading → At Job`, `Returning → To Job`) must be rejected with a `422 Unprocessable Entity`.

### Filtering & Sorting (List endpoint)
All fields are filterable: `code`, `name`, `status`, `description`
All fields are sortable; default sort should be configurable (e.g., by `createdAt` desc)
Pagination: `page` + `limit` query params

## Development Guidelines

### Running locally
```bash
# Install dependencies
npm install

# Start in dev mode
npm run start:dev
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
- DTOs must use `class-validator` decorators
- Services throw NestJS `HttpException` subclasses (`NotFoundException`, `ConflictException`, `UnprocessableEntityException`)
- No business logic in controllers
- All routes protected by `JwtAuthGuard` (applied globally or at controller level)

## API Reference

### Auth
No auth endpoints in this service. JWT tokens are issued by an external auth service. All routes in this service require a valid `Authorization: Bearer <token>` header.

### Trucks
| Method | Path          | Description                        |
|--------|---------------|------------------------------------|
| POST   | /trucks       | Create a truck                     |
| GET    | /trucks       | List trucks (filter + sort + page) |
| GET    | /trucks/:id   | Get single truck                   |
| PATCH  | /trucks/:id   | Update truck (incl. status change) |
| DELETE | /trucks/:id   | Delete truck                       |

#### List query params
| Param       | Type   | Description                          |
|-------------|--------|--------------------------------------|
| code        | string | Filter by code (partial match ok)    |
| name        | string | Filter by name (partial match ok)    |
| status      | enum   | Filter by exact status               |
| description | string | Filter by description (partial)      |
| sortBy      | string | Field to sort by (default: createdAt)|
| sortOrder   | asc\|desc | Sort direction (default: desc)   |
| page        | number | Page number (default: 1)             |
| limit       | number | Items per page (default: 10)         |

## Important Constraints
- `code` must be unique across all trucks — return `409 Conflict` on duplicate
- Status transitions must be validated on every PATCH that includes `status` — return `422 Unprocessable Entity` for invalid transitions
- The transition logic lives exclusively in `TrucksService`, never in the controller or schema
- Future ERP modules must follow the same module structure under `src/modules/`
