# Persistent Replan & Dummy DB Setup Walkthrough

This document outlines the implementation of the "Stable Replan" feature and the configuration of a local Dummy DB for safe testing.

## 1. Feature: Stable Replan with Persistence

We have implemented a robust schedule adjustment endpoint that minimizes worker reassignments ("Stable Replan").

### Implementation Details

- **Persistence:**
  - Modified `Plan` model to store `inputSnapshot` (full task/worker definition) on creation.
  - Updated `WorkerTaskController` to save this snapshot during file import.
- **Replanning Logic (`PlanAdjustmentService`):**
  - `adjustPlanReplanFromPlanId`: Orchestrates the replan using the stored snapshot.
  - **Historical Work Calculation:** Automatically derives "Work Done" from the original assignments before `currentTime` to ensure the replan effectively schedules only the *remaining* work.
  - **Penalty System:** Applies a configurable penalty to deter switching workers from their current tasks.
- **Controller:**
  - Updated `PlanController.adjustPlan` to support both `ephemeral` (stateless) and `planId` (persistent) requests.

## 2. Dummy DB Setup (Local Testing)

To test the persistence logic safely, we configured a local development environment.

### Setup Components

- **`.env.local`**: Contains the connection string for the dev DB (`postgres://...:5432/...`).
- **`src/config/db.ts`**: Updated to load `.env.local` if present.
- **`scripts/seed-dev-plan.ts`**: Seeds a test plan (`plan_dummy_1`) with realistic tasks and workers.

### How to Run

**Note: Requires a local Postgres server running on port 5432.**

1. **Ensure DB Exists:**

    ```bash
    createdb modular_factory_dev
    ```

    *(If command not found, use a GUI tool like pgAdmin or Tableau to create the database)*

2. **Push Schema & Seed:**

    ```bash
    # Note: Requires dotenv-cli (installed automatically if missing)
    npm run db:dev:push
    npm run db:dev:seed
    ```

3. **Verify:**
    Start the server:

    ```bash
    npm run dev
    ```

    Then verify the endpoint:

    ```bash
    curl http://localhost:8080/api/v1/plans/plan_dummy_1
    ```

### Troubleshooting

- **"P1001: Can't reach database server"**: Your local Postgres service is not running or not listening on port 5432. Start it manually.
- **Port Conflict**: Check if another service is using 5432. You can update `.env.local` to point to a different port if needed.

## 3. Verification

(Blocked pending Docker Availability)

- Once Docker is running, the `db:dev:seed` command should succeed.
- You can then test the endpoint with the provided Curl commands in `docs/DEV_DUMMY_DB.md`.
