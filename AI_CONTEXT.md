# AI Context for Truly

> **For detailed information, see the docs referenced below—avoid duplicating that content.**

## What is Truly?

An **open-core visual rule engine** with a React frontend and Spring Boot + Drools backend. Users define business rules visually (conditions → actions) and execute them via API.

**Core Value**: Visual-first rule authoring that non-engineers can use.

---

## Quick Reference

| Aspect | Details |
|--------|---------|
| **Frontend** | React 18, Vite, TypeScript, React Router |
| **Backend** | Spring Boot 3.2, Java 17, Drools 8.44 |
| **Database** | SQLite (default), PostgreSQL, MySQL |
| **Testing** | Playwright (E2E), Vitest (unit), JUnit |
| **Packaging** | Docker (unified image) |

---

## Repository Structure

```
truly/
├── backend/                 # Spring Boot API
│   └── src/main/java/com/ruleengine/
│       ├── controller/      # REST endpoints
│       ├── service/         # Business logic
│       ├── model/           # JPA entities
│       ├── dto/             # Request/response DTOs
│       ├── drools/          # DRL compilation & execution
│       ├── repository/      # Data access layer
│       └── config/          # App configuration
├── frontend/                # React SPA
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Route pages
│       ├── services/        # API client
│       └── types/           # TypeScript definitions
├── docker/                  # Docker configs
├── docs/                    # 📚 Detailed documentation
└── Dockerfile               # Unified container build
```

---

## Key Concepts

1. **Schema** – Defines data types (imported from Swagger/JSON Schema or manual). Has attributes with types.
2. **Rule Project** – Container for rules sharing the same input/output schemas.
3. **Rule** – Has conditions (LHS) and actions (RHS). Transpiled to Drools DRL at runtime.
4. **Execution** – POST facts to `/api/projects/{id}/execute`, get results back.

---

## API Overview

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/schemas` | Manage schemas |
| `POST /api/schemas/import` | Import from OpenAPI/Swagger |
| `GET/POST /api/projects` | Manage rule projects |
| `GET/POST /api/projects/{id}/rules` | Rules within a project |
| `POST /api/projects/{id}/execute` | Execute rules against facts |
| `POST /api/rules/{id}/test` | Test individual rules |
| `GET /api/health` | Health check |

---

## Development

```bash
# Backend (from /backend)
./mvnw spring-boot:run

# Frontend (from /frontend)
bun install && bun run dev   # or npm

# Docker (from root)
./docker-build.sh && docker-compose up
```

---

## Documentation Map

> **Read these for details. Don't ask for information already covered here.**

| Document | What It Covers |
|----------|----------------|
| [docs/PRODUCT_STRATEGY.md](docs/PRODUCT_STRATEGY.md) | Vision, open-core model, roadmap, SaaS strategy, pricing |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Product goals, functional requirements, use cases |
| [docs/technical/01-rule-projects.md](docs/technical/01-rule-projects.md) | Rule Projects domain model, API spec, ER diagram |
| [docs/technical/data-storage.md](docs/technical/data-storage.md) | Database design, multi-database support |
| [docs/technical/multi-tenancy.md](docs/technical/multi-tenancy.md) | Future SaaS multi-tenancy architecture |
| [docs/features/02-schema-editing.md](docs/features/02-schema-editing.md) | Schema editing with impact analysis |

---

## Architecture Decisions

- **SQLite-first**: Single-file database for easy deployment and multi-tenant isolation (DB-per-tenant strategy)
- **Drools for execution**: Industry-standard rule engine; rules are authored visually but compiled to DRL
- **Unified Docker image**: Frontend (nginx) + Backend in single container
- **Open-core model**: Core features free/MIT; team/enterprise features reserved for future SaaS

---

## Common Tasks

### Adding a new entity
1. Create model in `backend/src/main/java/com/ruleengine/model/`
2. Create repository in `repository/`, DTO in `dto/`
3. Add service logic in `service/`
4. Expose via controller in `controller/`

### Adding a frontend page
1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add API calls via `frontend/src/services/api.ts`

### Testing
```bash
# Backend tests
cd backend && ./mvnw test

# Frontend E2E
cd frontend && bun run test:e2e
```

---

## What NOT to Change Without Understanding

- `drools/` package: Handles DRL transpilation—changes affect all rule execution
- Database schema: Check impact on existing projects/rules
- `ConditionTranspiler`/`ActionTranspiler`: Core rule-to-DRL logic
