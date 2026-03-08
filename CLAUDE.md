# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Modular Factory Scheduler is a Manufacturing Execution System (MES) backend that implements intelligent labor allocation and task scheduling. The core algorithm optimizes worker-to-task assignments while respecting constraints (min/max workers, prerequisites, availability windows, shift boundaries). Also includes a React frontend (Vite) and RAG-based AI chat integration.

## Commands

```bash
npm run dev          # Start dev server with nodemon (hot-reload)
npm run build        # Compile TypeScript to dist/
npm start            # Run production server from dist/server.js
npm test             # Run Jest tests
npm run clean        # Clear dist/ directory

# Run a single test file
npx jest tests/estimation.test.ts
# Run tests matching a pattern
npx jest --testNamePattern "anti-swarm"

# Database (Prisma)
npm run db:generate  # Generate Prisma client
npm run db:push      # Sync schema to database
npm run db:migrate   # Create and run migrations
npm run db:studio    # Launch Prisma Studio
npm run db:dev:reset # Push schema + seed dev data

# Frontend (client/)
npm run build:client # Install deps + build React app
# Dev: cd client && npm run dev (Vite on port 5173)

# GCP deploy
npm run gcp-build    # db:generate + build + build:client
```

## Architecture

**Entry:** `src/server.ts` → `src/app.ts` (Express on port 3000/8080)

Express app serves the React SPA from `client/dist/` with a catch-all route. CORS allows `localhost:5173` (Vite dev) and `localhost:3000`. JSON payload limit: 5MB. Rate limiting via `generalLimiter` middleware.

### Core Services (`src/services/`)

- **PlanningService** - Main scheduling engine using phase-based greedy algorithm
  - Configurable time step (default 5 minutes via `schedulingConfig.ts`)
  - Min assignment granularity: 30, 60, or 90 minutes
  - Phase 1 (Morning Push): First 4 hours, critical path focus
  - Phase 2 (Afternoon): Balanced flow for remaining tasks
  - Calculates critical path scores via topological analysis

- **BalancingService** - Worker-task matching with weighted scoring
  - Loads preferences from CSV (`Worker-Task algo data - Workers.csv`)
  - Continuity bonus: +1000 (stay on same task)
  - Switching penalty: -500
  - Primary skill: +100, Secondary: +50
  - Anti-swarm cap: `optimalCrew = ceil(totalHours / 4)`, soft max of 4 workers

- **ResourceManager** - Single source of truth for current assignments
  - Tracks bookings, prevents double-assignment
  - Provides continuity lookup (previous task per worker)

- **SkillMatchingService** (KAN-383) - Hard-constraint skill matching
  - `match()` for one-time assignments (no time dimension)
  - Enforces ALL required skills per task

- **TaskInterruptionService** (KAN-468) - Task blocking/resuming
  - Ephemeral in-memory store
  - `maxWorkersDuringInterruption` can reduce crew below normal

- **LaborCalculator** - Variable throughput engine
  - Calculates labor hours from box characteristics using ratios

- **MultiShiftPlanningService** - Multi-shift planning across shift boundaries
  - Iterates shifts, tracks remaining hours, seeds assignments across shifts

- **VerificationService** - Validates schedules against hard constraints

### Request Flow

```
POST /api/v1/worker-tasks/plan
  → workerTaskController.plan()
  → planningService.plan(request)
  → balancingService.balance() [per time step]
  → scheduleAggregator.aggregate() [consolidate steps]
  → Response: SimulationResult
```

### Key Types (`src/types/index.ts`)

Large type file (~50 interfaces) organized by domain:

```typescript
// Core scheduling
Worker { workerId, name, availability?, preferences? }
Task { taskId, minWorkers?, maxWorkers?, estimatedTotalLaborHours?,
       prerequisiteTaskIds?, shiftCompletionPreference? }
PlanRequest { workers, tasks, interval, useHistorical, config? }
SimulationResult { assignments, unassignedWorkers, unassignedTasks, story }

// Multi-shift
MultiShiftPlanRequest / MultiShiftPlanResponse / TaskShiftProgress

// Skill matching (KAN-383)
SkillMatchingRequest / SkillMatchingResponse / SkillCode (A-M codes)

// Task interruptions (KAN-468)
TaskInterruption / CreateInterruptionRequest / TaskInterruptionReason

// Labor calculation (Phase 2)
BoxCharacteristics / LaborRatio / LaborCalculationResult
```

### Important Utilities (`src/utils/`)

- `schedulingConfig.ts` - Resolve config defaults (timeStep=5min, minAssignment=30min)
- `excelLoader.ts` - Parse Excel input (Workers/Tasks sheets)
- `excelGenerator.ts` - Export results to Excel
- `scheduleAggregator.ts` - Merge time steps into contiguous assignments
- `estimation.ts` - Compute labor hours from module attributes
- `preferenceLoader.ts` - Load worker preference CSV

## Algorithm Design Decisions

1. **Anti-Swarm Cap**: Prevents swarming small tasks. Formula: `optimalCrew = ceil(totalHours / 4)` with soft cap of 4 workers unless task >20 hours.

2. **Sticky Continuity (+1000 bonus)**: Workers staying on their current task get 10x higher score than skill matching. Creates stable, human-friendly schedules.

3. **Morning Push Strategy**: First 4 hours aggressively attack critical path tasks. Afternoon uses balanced flow.

4. **Crunch Time Logic**: Late in day boosts crew size to meet deadlines.

5. **In-Progress Priority**: Tasks already started get priority over new tasks.

## Coding Conventions

- TypeScript with `strict` enabled (CommonJS module system)
- 4-space indentation
- `PascalCase` for types/classes, `camelCase` for variables/functions
- No formatter/linter configured on backend - match nearby code style
- Commit messages: imperative mood with optional `feat:`/`fix:` prefix

## tsconfig Exclude List

`tsconfig.json` has a large `exclude` array of legacy/dormant controllers, routes, and models (Data Connect, Firestore-era code). These files exist in `src/` but are **not compiled**. Avoid modifying them unless specifically migrating them back into the build.

## Database

Prisma ORM with PostgreSQL. Schema in `prisma/schema.prisma` (~50 models covering full product/module/task lifecycle). Database is optional for core scheduling - `planningService.plan()` works with in-memory data passed via request body.

## API Endpoints

All under `/api/v1/worker-tasks/`:

```
# Core scheduling
POST /plan                              # Plan from JSON
POST /plan-file                         # Plan from Excel upload
POST /plan-export                       # Plan + export Excel
POST /plan-file-export                  # Excel in + Excel out

# Multi-shift
POST /calculate-schedule                # Multi-shift planning (JSON)
POST /plan-file-multishift              # Multi-shift from Excel
POST /plan-file-multishift-shiftids     # Multi-shift with explicit shift IDs
POST /plan-file-multishift-export       # Multi-shift + Excel export

# Skill matching (KAN-383)
POST /match                             # One-time skill-based matching

# Task interruptions (KAN-468)
POST /:planId/interruptions             # Create interruption
POST /:planId/interruptions/:taskId/resolve  # Resolve interruption
GET  /:planId/interruptions             # List interruptions

# Other
POST /cross-dept-plan                   # Cross-department planning
POST /production-plan/preview           # Production plan preview (Swift client)
GET  /health                            # Health check (mounted at root)
```

## Testing

Jest with ts-jest. Config in `jest.config.js`. Test roots: `src/` and `tests/`. Test files use `*.test.ts` pattern. Focus unit tests on scheduling logic in services.

Key test files:
- `tests/estimation.test.ts` - Labor hour estimation
- `tests/matching.edge.test.ts` - Edge cases for worker-task matching
- `tests/optimization.test.ts` - Scheduling optimization
- `tests/multiShiftPlanning.test.ts` - Multi-shift scenarios
- `src/tests/acceptance_constraints.test.ts` - Constraint validation
- `src/tests/skillMatchingService.test.ts` - Skill matching logic

## External Integrations

- **Firebase**: Auth (admin SDK) + optional Data Connect
- **LLM/RAG**: OpenAI, Anthropic, Google via LangChain (`src/services/rag/`, `src/config/llmConfig.ts`)
- **Pinecone**: Vector DB for document embeddings
- **LlamaParse**: PDF parsing for RAG pipeline

## Frontend

React SPA in `client/` built with Vite + TypeScript + Tailwind CSS. Served by Express in production from `client/dist/`. Dev server runs on port 5173.
