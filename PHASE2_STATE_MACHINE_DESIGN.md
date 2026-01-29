# Phase 2: Variable Throughput Engine - State Machine Design

## Overview

Phase 2 transforms the factory scheduler from a **stateless shift planner** into a **stateful production state machine**. The core insight: **the production unit (box) is the entity that persists, not the shift**.

---

## Core Concept: The Factory State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FACTORY STATE                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    PRODUCTION UNITS (BOXES)                   │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │  │
│  │  │ Box #1  │  │ Box #2  │  │ Box #3  │  │ Box #4  │   ...   │  │
│  │  │ 100%    │  │ 72%     │  │ 45%     │  │ 0%      │         │  │
│  │  │ DONE    │  │ Station6│  │ Station4│  │ QUEUED  │         │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    SHIFT EXECUTION                          │    │
│  │   Shift 1 (75%)  ──────►  Shift 2 (25%)  ──────►  Next Day │    │
│  │   Updates box states      Continues from                   │    │
│  │   according to rate       where Shift 1 left off           │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## New Data Models

### 1. ProductionUnit (Box)

```typescript
/**
 * A production unit (box/module) that moves through the factory.
 * This is the PRIMARY entity that persists across shifts.
 */
export interface ProductionUnit {
    unitId: string;                    // e.g., "box-001"
    unitType: string;                  // e.g., "standard", "premium", "custom"

    // Characteristics that affect labor hours
    characteristics: {
        dimension: number;             // e.g., 12 (feet)
        weight: number;                // e.g., 500 (lbs)
        surfaceArea: number;           // e.g., 144 (sq ft)
        complexity: 'low' | 'medium' | 'high';
        // Extensible: add more as needed
    };

    // Current state in the factory
    currentStation: number;            // 1-16 (which station it's at)
    status: 'queued' | 'in_progress' | 'completed' | 'blocked';

    // Progress tracking per task
    taskProgress: Map<string, TaskUnitProgress>;

    // Overall completion
    overallCompletionPct: number;      // 0-100

    // Timestamps
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
}

/**
 * Progress of a specific task on a specific production unit
 */
export interface TaskUnitProgress {
    taskId: string;
    taskName: string;

    // Labor hours tracking
    totalRequiredHours: number;        // Based on unit characteristics
    hoursCompleted: number;            // Accumulated across all shifts
    hoursRemaining: number;            // = total - completed

    // Shift-level breakdown
    shiftBreakdown: Array<{
        shiftId: string;
        date: string;
        hoursWorked: number;
        workersAssigned: string[];
    }>;

    // Status
    completionPct: number;             // 0-100
    status: 'not_started' | 'in_progress' | 'completed' | 'blocked';

    // Constraints
    mustCompleteInShift?: string;      // e.g., "shift-1" if must finish in Shift 1
}
```

### 2. ProductionSchedule (Weekly/Multi-Day Plan)

```typescript
/**
 * A production schedule spanning multiple days/shifts.
 * Example: "4 boxes over 7 days" or "2.5 boxes per week"
 */
export interface ProductionSchedule {
    scheduleId: string;

    // Production targets
    targetUnits: number;               // e.g., 4 boxes
    targetDays: number;                // e.g., 7 days
    unitsPerDay: number;               // = 4/7 = 0.57 boxes/day

    // Time boundaries
    startDate: string;
    endDate: string;

    // Shifts configuration
    shifts: ShiftConfiguration[];

    // Production units in this schedule
    units: ProductionUnit[];

    // Production rate (throughput)
    productionRate: number;            // 0.5 = 50%, 1.0 = 100%

    // State tracking
    currentDay: number;
    currentShift: string;

    // Milestones
    milestones: Array<{
        date: string;
        expectedUnitsComplete: number;
        actualUnitsComplete: number;
        variance: number;              // + ahead, - behind
    }>;
}

/**
 * Configuration for a single shift
 */
export interface ShiftConfiguration {
    shiftId: string;
    dayIndex: number;                  // 0 = first day, 1 = second day, etc.
    startTime: string;                 // "07:00"
    endTime: string;                   // "17:00"
    availableHours: number;            // 10 hours
    productionRate: number;            // 0.75 = 75% of work should happen here
    workers: string[];                 // Worker IDs available for this shift
}
```

### 3. FactoryState (Global State Container)

```typescript
/**
 * The master state container for the entire factory.
 * This is the "brain" that persists across all shifts.
 */
export interface FactoryState {
    // Current state version (for optimistic locking)
    version: number;
    lastUpdated: string;

    // Active production schedule
    activeSchedule: ProductionSchedule;

    // All production units (current + historical)
    units: Map<string, ProductionUnit>;

    // Station occupancy
    stations: Map<number, {
        stationId: number;
        stationName: string;
        currentUnit?: string;          // unitId of box at this station
        status: 'idle' | 'active' | 'blocked';
    }>;

    // Worker state
    workers: Map<string, {
        workerId: string;
        currentShift?: string;
        assignedStation?: number;
        assignedTask?: string;
        hoursWorkedToday: number;
    }>;

    // Deficit tracking (tasks that need more workers)
    deficits: Array<{
        taskId: string;
        stationId: number;
        hoursDeficit: number;
        skillsNeeded: string[];
    }>;
}
```

---

## State Transitions

### Box Lifecycle States

```
    ┌──────────┐
    │  QUEUED  │ ◄── New box enters the system
    └────┬─────┘
         │ Shift starts, box assigned to Station 1
         ▼
    ┌──────────────┐
    │ IN_PROGRESS  │ ◄── Work happening on tasks
    └──────┬───────┘
           │
    ┌──────┴──────────────────────────────────────┐
    │                                             │
    ▼                                             ▼
┌────────────┐                            ┌───────────┐
│  BLOCKED   │ ── Prerequisites not met   │ COMPLETED │
└────────────┘    or workers unavailable  └───────────┘
       │                                       │
       │ Resolved                              │
       ▼                                       ▼
┌──────────────┐                         (Exit system)
│ IN_PROGRESS  │
└──────────────┘
```

### Task State on a Box

```
NOT_STARTED ──► IN_PROGRESS ──► COMPLETED
                    │
                    ▼
               (End of Shift)
                    │
                    ▼
           Next Shift picks up
           where this left off
```

---

## Production Rate Scaling

### The Math

When production rate < 100%, labor hours are **inversely scaled**:

```
effectiveHours = baseHours / productionRate

Example:
- Task baseline: 10 labor hours
- Production rate: 0.5 (50%)
- Effective hours needed: 10 / 0.5 = 20 hours
```

### Why This Makes Sense

At 50% throughput:
- Fewer workers available, OR
- Workers assigned to multiple boxes, OR
- Deliberate slowdown to match demand

The task still requires the same total effort, but spread over more calendar time.

### Implementation

```typescript
function applyProductionRate(task: Task, rate: number): Task {
    const scaledTotal = (task.estimatedTotalLaborHours || 0) / rate;
    const scaledRemaining = (task.estimatedRemainingLaborHours || 0) / rate;

    return {
        ...task,
        estimatedTotalLaborHours: scaledTotal,
        estimatedRemainingLaborHours: scaledRemaining,
        _originalHours: task.estimatedTotalLaborHours,  // Keep original for reference
        _appliedRate: rate
    };
}
```

---

## Cross-Shift Continuation Algorithm

### Current Flow (Stateless)

```
Shift 1 Planning
    └── Calculate assignments
    └── Calculate remaining hours
    └── Pass remaining hours to Shift 2

Shift 2 Planning
    └── Clone tasks with updated remaining hours
    └── Calculate assignments (fresh start)
    └── No memory of Shift 1 context
```

### New Flow (Stateful)

```
Load Factory State
    │
    ▼
Shift 1 Planning
    ├── Read box states (which boxes, what progress)
    ├── Calculate assignments
    ├── Update box states in-place
    └── Persist Factory State

    │
    ▼ (Factory State persists)
    │
Shift 2 Planning
    ├── Load Factory State (knows Shift 1 progress)
    ├── Read box states (continuation context)
    ├── Calculate assignments (starts where Shift 1 ended)
    ├── Update box states
    └── Persist Factory State
```

### Key Difference

**Stateless**: "Task T1 has 5 hours remaining" (no context of WHO worked on it or WHERE)

**Stateful**: "Box #3 at Station 6, Task T1 is 50% complete. Worker W5 did 2.5 hours yesterday. 2.5 hours remain. Worker W5 has continuity bonus if assigned again."

---

## Excel Input Format (Phase 2)

### New Columns for Tasks Sheet

| Column | Description | Example |
|--------|-------------|---------|
| `BoxID` | Which production unit | `box-001` |
| `ProductionRate` | Throughput multiplier | `0.75` |
| `Dimension` | Box dimension (characteristic) | `12` |
| `Weight` | Box weight (characteristic) | `500` |
| `MustCompleteInShift` | Shift constraint | `shift-1` or blank |
| `CarriedFromPreviousDay` | Is this a continuation? | `TRUE` / `FALSE` |
| `PreviousDayProgress` | How much was done yesterday | `0.45` (45%) |

### Example Row

```
TaskName: Rough Plumbing
BoxID: box-003
LaborHoursRemaining: 8
ProductionRate: 0.6
Dimension: 14
Weight: 600
MinWorkers: 2
MaxWorkers: 4
MustCompleteInShift: (blank)
CarriedFromPreviousDay: TRUE
PreviousDayProgress: 0.40
```

This tells the system:
- Working on Box #3
- 8 hours remain at 60% throughput = 8/0.6 = 13.3 effective hours
- 40% was completed yesterday
- No strict shift completion requirement

---

## New Service: BoxStateManager

```typescript
/**
 * Manages production unit (box) state across shifts.
 * This is the core of the Phase 2 State Machine.
 */
export class BoxStateManager {
    private state: FactoryState;

    constructor(initialState?: FactoryState) {
        this.state = initialState || this.createEmptyState();
    }

    /**
     * Load state from persistence (DB, file, etc.)
     */
    async loadState(): Promise<void> {
        // Load from database or file
    }

    /**
     * Persist state after shift completion
     */
    async saveState(): Promise<void> {
        this.state.version++;
        this.state.lastUpdated = new Date().toISOString();
        // Save to database or file
    }

    /**
     * Get the current progress of a box on a specific task
     */
    getTaskProgress(unitId: string, taskId: string): TaskUnitProgress | undefined {
        const unit = this.state.units.get(unitId);
        return unit?.taskProgress.get(taskId);
    }

    /**
     * Update progress after assignments are made
     */
    updateProgress(
        unitId: string,
        taskId: string,
        hoursWorked: number,
        shiftId: string,
        workers: string[]
    ): void {
        const unit = this.state.units.get(unitId);
        if (!unit) return;

        const progress = unit.taskProgress.get(taskId);
        if (!progress) return;

        // Update hours
        progress.hoursCompleted += hoursWorked;
        progress.hoursRemaining = Math.max(0, progress.totalRequiredHours - progress.hoursCompleted);
        progress.completionPct = (progress.hoursCompleted / progress.totalRequiredHours) * 100;

        // Record shift breakdown
        progress.shiftBreakdown.push({
            shiftId,
            date: new Date().toISOString().split('T')[0],
            hoursWorked,
            workersAssigned: workers
        });

        // Update status
        if (progress.completionPct >= 100) {
            progress.status = 'completed';
        } else if (progress.hoursCompleted > 0) {
            progress.status = 'in_progress';
        }

        // Update overall box completion
        this.recalculateBoxCompletion(unitId);
    }

    /**
     * Get remaining hours for a task, considering continuation from previous shift
     */
    getRemainingHours(unitId: string, taskId: string): number {
        const progress = this.getTaskProgress(unitId, taskId);
        return progress?.hoursRemaining || 0;
    }

    /**
     * Check if a task can start (prerequisites met)
     */
    canTaskStart(unitId: string, taskId: string, prerequisites: string[]): boolean {
        for (const prereq of prerequisites) {
            const prereqProgress = this.getTaskProgress(unitId, prereq);
            if (!prereqProgress || prereqProgress.status !== 'completed') {
                return false;
            }
        }
        return true;
    }

    /**
     * Move a box to the next station
     */
    advanceBox(unitId: string, toStation: number): void {
        const unit = this.state.units.get(unitId);
        if (unit) {
            unit.currentStation = toStation;
        }
    }

    /**
     * Generate a snapshot for Excel export
     */
    exportState(): BoxStateSnapshot[] {
        return Array.from(this.state.units.values()).map(unit => ({
            unitId: unit.unitId,
            station: unit.currentStation,
            overallCompletion: unit.overallCompletionPct,
            tasks: Array.from(unit.taskProgress.values()).map(tp => ({
                taskId: tp.taskId,
                taskName: tp.taskName,
                completion: tp.completionPct,
                hoursRemaining: tp.hoursRemaining
            }))
        }));
    }
}
```

---

## Integration Points

### 1. MultiShiftFilePlanningService Changes

```typescript
// Before: Stateless
const shift2Tasks = this.cloneTasks(baseTasks).map(task => ({
    ...task,
    estimatedRemainingLaborHours: remainingAfterShift1.get(task.taskId) || 0
}));

// After: Stateful
const boxStateManager = new BoxStateManager();
await boxStateManager.loadState();

const shift2Tasks = this.cloneTasks(baseTasks).map(task => {
    const boxId = task.boxId || 'default';
    const remaining = boxStateManager.getRemainingHours(boxId, task.taskId);
    const scaledRemaining = remaining / shift2.productionRate;

    return {
        ...task,
        estimatedRemainingLaborHours: scaledRemaining,
        _boxId: boxId,
        _continuedFromShift: true
    };
});
```

### 2. ExcelLoader Changes

```typescript
// Add parsing for new columns
const boxId = row['BoxID'] || `box-${index}`;
const productionRate = Number(row['ProductionRate']) || 1.0;
const carriedOver = row['CarriedFromPreviousDay'] === 'TRUE';
const previousProgress = Number(row['PreviousDayProgress']) || 0;

tasks.push({
    ...existingFields,
    boxId,
    productionRateMultiplier: productionRate,
    _carriedOver: carriedOver,
    _previousProgress: previousProgress,
    moduleAttributes: [
        { attributeId: 'dimension', value: Number(row['Dimension']) || 0 },
        { attributeId: 'weight', value: Number(row['Weight']) || 0 }
    ]
});
```

### 3. API Endpoint for State Management

```typescript
// New endpoints
router.get('/factory-state', controller.getFactoryState);
router.post('/factory-state/reset', controller.resetFactoryState);
router.post('/factory-state/advance-shift', controller.advanceShift);
router.get('/box/:boxId/progress', controller.getBoxProgress);
```

---

## File Structure for Phase 2

```
src/
├── services/
│   ├── boxStateManager.ts         # NEW: Core state machine
│   ├── productionScheduler.ts     # NEW: Multi-day scheduling
│   ├── throughputCalculator.ts    # NEW: Production rate logic
│   ├── planningService.ts         # MODIFIED: Use boxStateManager
│   └── multiShiftFilePlanningService.ts  # MODIFIED: Stateful planning
├── types/
│   └── index.ts                   # ADD: ProductionUnit, FactoryState, etc.
├── utils/
│   ├── excelLoader.ts             # MODIFIED: Parse new columns
│   └── stateSerializer.ts         # NEW: Save/load factory state
└── controllers/
    └── factoryStateController.ts  # NEW: State management API
```

---

## Testing Strategy

### Unit Tests

1. **BoxStateManager.updateProgress()** - Hours accumulate correctly
2. **BoxStateManager.canTaskStart()** - Prerequisites enforced
3. **applyProductionRate()** - Scaling math is correct
4. **Cross-shift continuation** - State persists correctly

### Integration Tests

1. **2-shift scenario**: Box starts at 0%, reaches 60% in Shift 1, completes in Shift 2
2. **Variable throughput**: Same task takes longer at 50% rate
3. **Multi-box**: 4 boxes over 7 days, all complete on time

### Validation Criteria

- [ ] Box progress never exceeds 100%
- [ ] Box progress never decreases
- [ ] Completed tasks are never re-assigned
- [ ] Production rate scaling is mathematically correct
- [ ] State persists across service restarts

---

## Migration Path

### Step 1: Add new types (non-breaking)
Add `ProductionUnit`, `FactoryState` to types/index.ts

### Step 2: Create BoxStateManager (isolated)
Implement in new file, no existing code changes

### Step 3: Extend ExcelLoader (backward compatible)
Parse new columns if present, fallback to existing behavior

### Step 4: Integrate with MultiShiftFilePlanningService
Add optional boxStateManager usage, feature-flagged

### Step 5: Add new API endpoints
For state management and debugging

### Step 6: Full integration
Make boxStateManager the default, remove feature flags

---

## Success Metrics

Phase 2 is complete when:

1. ✅ System handles "2.5 boxes/week" production rate
2. ✅ Task progress persists across shifts correctly
3. ✅ Variable throughput (50%, 75%, 100%) works mathematically
4. ✅ Excel export shows per-shift progress per box
5. ✅ No regression in single-shift or 2-shift planning
6. ✅ Box characteristics affect labor hour estimation

---

## Next Steps

1. **Implement `BoxStateManager`** class
2. **Add new types** to `src/types/index.ts`
3. **Update `excelLoader.ts`** to parse new columns
4. **Create `throughputCalculator.ts`** for rate scaling
5. **Modify `multiShiftFilePlanningService.ts`** to use state manager
6. **Add integration tests** for multi-day scenarios
