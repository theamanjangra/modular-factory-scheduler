# Modular Factory Scheduler (Vederra API)

## Project Overview

This project is a **Manufacturing Execution System (MES) Scheduler** backend, built on top of a "Vederra" server architecture. Its primary purpose is to generate optimized worker-task schedules ("Liquid Resource" scheduling) to ensure factory tasks are completed efficiently.

**Key Capabilities:**
*   **Schedule Planning:** Allocates labor to tasks over a timeline.
*   **Multi-Shift Support:** Recently added capability to split work across multiple shifts (e.g., 75% Shift 1, 25% Shift 2).
*   **Resource Optimization:** Accelerates tasks when excess capacity is available.
*   **User & Employee Management:** Standard CRUD for users, employees, and time logs.

## Architecture

*   **Runtime:** Node.js (v16+)
*   **Language:** TypeScript
*   **Framework:** Express.js
*   **Database:** PostgreSQL (accessed via Prisma ORM)
*   **Authentication:** Firebase Admin SDK (Bearer tokens)
*   **Validation:** Yup
*   **Testing:** Jest

## Directory Structure

*   `src/` - Backend source code.
    *   `controllers/` - REST API controllers (Worker Tasks, Users, Employees).
    *   `services/` - Core algorithmic logic (Scheduling, Optimization).
    *   `models/` & `types/` - Domain models and interfaces.
*   `scripts/` - **CRITICAL**. Contains utility scripts for simulation, testing, and debugging.
    *   `test_multishift.ts` - Integration test for the multi-shift logic.
    *   `migrate-to-prisma.js` - Database migration helper.
*   `client/` - Frontend application (Vite-based).
*   `prisma/` - Database schema (`schema.prisma`) and migrations.
*   `data/` - Input data for simulations (Excel/JSON).

## Setup & Development

### 1. Installation
```bash
npm install
```

### 2. Environment Variables
Ensure a `.env` file exists with the following keys (see `.env.example`):
*   `DATABASE_URL` (PostgreSQL connection string)
*   `FIREBASE_*` (Credentials for Auth)
*   `PORT` (default 3000)

### 3. Running the Server
```bash
# Development (with hot-reload)
npm run dev

# Production
npm run build
npm start
```

### 4. Database Management
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to DB
npm run db:push
```

### 5. Testing
```bash
# Run unit tests
npm test
```

## Current Focus: Multi-Shift Logic

The project is currently focused on perfecting the **Multi-Shift** scheduling.
*   **Issue:** Previous bugs caused only Shift 1 to be planned.
*   **Solution:** Ensure `shift2StartTime` and `shift2EndTime` are passed to the API.
*   **Verification:** Use `scripts/test_multishift.ts` to verify fixes.

**Recommended Debugging Command:**
```bash
npx ts-node scripts/test_multishift.ts
```

## API Documentation

*   **Core API:** See `API_DOCUMENTATION.md` for User/Employee endpoints.
*   **Scheduling API:**
    *   `POST /api/v1/worker-tasks/plan` - Single shift planning.
    *   `POST /api/v1/worker-tasks/plan-file-multishift-shiftids` - Multi-shift planning (requires Excel file upload).

## Useful Documentation
*   `MULTISHIFT_SUMMARY.md` - Details on the multi-shift implementation and fix.
*   `AGENTS.md` - Guidelines for repository structure and coding standards.
*   `PHASE2_STATE_MACHINE_DESIGN.md` - Advanced architectural designs.
