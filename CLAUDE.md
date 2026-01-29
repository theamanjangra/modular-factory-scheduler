# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Modular Factory Scheduler is a Manufacturing Execution System (MES) backend that implements intelligent labor allocation and task scheduling. The core algorithm optimizes worker-to-task assignments while respecting constraints (min/max workers, prerequisites, availability windows, shift boundaries).

## Commands

```bash
npm run dev          # Start dev server with nodemon (hot-reload)
npm run build        # Compile TypeScript to dist/
npm start            # Run production server from dist/server.js
npm test             # Run Jest tests
npm run clean        # Clear dist/ directory

# Database (Prisma)
npm run db:generate  # Generate Prisma client
npm run db:push      # Sync schema to database
npm run db:migrate   # Create and run migrations
npm run db:studio    # Launch Prisma Studio
```

## Architecture

**Entry:** `src/server.ts` → `src/app.ts` (Express on port 3000/8080)

### Core Services (`src/services/`)

- **PlanningService** - Main scheduling engine using phase-based greedy algorithm
  - 30-minute time blocks (TIME_STEP_MINUTES)
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

```typescript
Worker { workerId, name, availability?, preferences? }
Task { taskId, minWorkers?, maxWorkers?, estimatedTotalLaborHours?,
       prerequisiteTaskIds?, shiftCompletionPreference? }
PlanRequest { workers, tasks, interval: {startTime, endTime}, useHistorical }
SimulationResult { assignments, unassignedWorkers, unassignedTasks, story }
```

### Important Utilities

- `excelLoader.ts` - Parse Excel input (Workers/Tasks sheets)
- `excelGenerator.ts` - Export results to Excel
- `scheduleAggregator.ts` - Merge 30-min steps into contiguous assignments
- `estimation.ts` - Compute labor hours from module attributes

## Algorithm Design Decisions

These "critical choices" resolve ambiguities in the original specification:

1. **Anti-Swarm Cap**: Prevents swarming small tasks. Formula: `optimalCrew = ceil(totalHours / 4)` with soft cap of 4 workers unless task >20 hours.

2. **Sticky Continuity (+1000 bonus)**: Workers staying on their current task get 10x higher score than skill matching. Creates stable, human-friendly schedules.

3. **Morning Push Strategy**: First 4 hours aggressively attack critical path tasks. Afternoon uses balanced flow.

## Coding Conventions

- TypeScript with `strict` enabled (CommonJS)
- 4-space indentation
- `PascalCase` for types/classes, `camelCase` for variables/functions
- No formatter/linter configured - match nearby code style
- Commit messages: imperative mood with optional `feat:`/`fix:` prefix

## Database

Prisma ORM with PostgreSQL. Schema in `prisma/schema.prisma`. Database is optional for core scheduling - planning works with in-memory data.

## API Endpoints

```
POST /api/v1/worker-tasks/plan              # Plan from JSON
POST /api/v1/worker-tasks/plan-file         # Plan from Excel upload
POST /api/v1/worker-tasks/plan-export       # Plan + export Excel
POST /api/v1/worker-tasks/plan-file-export  # Excel in + Excel out
POST /api/v1/worker-tasks/calculate-schedule # Multi-shift planning
GET  /health                                 # Health check
```

## Testing

Jest with ts-jest. Test files use `*.test.ts` pattern in `tests/` or `src/tests/`. Focus unit tests on scheduling logic in services.
