# Rule Engine

A visual rule authoring platform with Drools integration.

## Quick Start

```bash
# Start with PostgreSQL (default)
docker-compose up

# Or with MySQL
DB_TYPE=mysql docker-compose up

# Or with SQLite (local dev)
DB_TYPE=sqlite docker-compose up
```

## Project Structure

- `backend/` - Spring Boot + Drools API
- `frontend/` - React + Vite UI
- `docker-compose.yml` - Container orchestration

## Documentation

See [Implementation Plan](/.gemini/antigravity/brain/dd377276-c400-4c07-929a-9565077a1b52/implementation_plan.md) for architecture details.
