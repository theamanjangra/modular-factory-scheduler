# Dummy DB Setup for Local Testing

This guide explains how to set up a local Postgres database (no Docker required) to test the persistence-based endpoints (e.g., `POST /api/v1/plans/:planId/adjust`) without affecting production data.

## 1. Environment Configuration

The project uses `.env.local` to override connection settings for development.
For a local Postgres install, set your connection string here:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/modular_factory_dev?schema=public"
```

## 2. Start Local Postgres (No Docker)

Ensure Postgres is installed and running on your machine. If you already have a local Postgres service, make sure the database exists:

```bash
createdb modular_factory_dev
```

## 3. Provision Schema & Seed Data

Once the DB is up, push the Prisma schema and seed a dummy plan (`plan_dummy_1`).

```bash
npm run db:dev:push
npm run db:dev:seed
```

This creates:

- A Plan with ID `plan_dummy_1`
- A valid `inputSnapshot` containing tasks and workers
- Initial `assignments` for the plan

## 4. Helper Commands

| Command | Description |
|---------|-------------|
| `npm run db:dev:push` | Push schema changes to local DB |
| `npm run db:dev:seed` | Seed the `plan_dummy_1` data |
| `npm run db:dev:reset` | Push and Seed (Fresh Start) |

If you still prefer Docker, use:

| Command | Description |
|---------|-------------|
| `npm run db:dev:docker:start` | Start local Postgres container |
| `npm run db:dev:docker:stop` | Stop local Postgres container |

## 5. Verification (Curl)

**Get the Plan:**

```bash
curl http://localhost:8080/api/v1/plans/plan_dummy_1
```

**Adjust the Plan (Replan):**

```bash
curl -X POST http://localhost:8080/api/v1/plans/plan_dummy_1/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "currentTime": "2024-05-20T10:00:00Z",
    "updates": [
        { "taskId": "task_1", "laborHoursRemaining": 5 }
    ]
  }'
```
