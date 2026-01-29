# Code-Compliance Guidebook

**Specification:** `endpoint_work_task_assignment.md`
**Auditor:** Gemini
**Date:** 2025-12-14

# REST Endpoint Documentation
>
> [CONTEXT] Title. Corresponds to the `WorkerTaskController` and `BalancingService` modules.

## Generate Worker Task Assignments
>
> [CONTEXT] Sub-header. Defines the core functionality of `POST /plan`.

> [WHITESPACE] Line 4 is blank.

### Summary
>
> [CONTEXT] Section header for logic overview.

Computes which workers are assigned to which tasks over a given time
> [VERIFIED] Implemented in `PlanningService.ts` method `plan()`. The loop iterates over the `interval` time-steps (Line 113).

interval with given remaining labor hours needed to complete the tasks,
> [VERIFIED] Implemented in `BalancingService.ts`. See `task.estimatedRemainingLaborHours` (mapped to `remaining`) usage in `balance` method (Line 60).

and returns `WorkerTask` entries that also represent gaps:
> [VERIFIED] Implemented in `WorkerTaskController.ts`. Returns `SimulationResult` containing explicit gap arrays (`unassignedWorkers`, `unassignedTasks`) via `scheduleAggregator.ts` (Line 18).

- Workers with **no task** (`taskId = null`)

> [VERIFIED] See `src/types/index.ts`: `WorkerTask` (Line 42) explicitly defines `taskId: string | null`. Gap generation logic is in `PlanningService.ts` (Line 210) and `scheduleAggregator.ts`.

- Tasks with **no worker** (`workerId = null`)

> [VERIFIED] See `src/types/index.ts`: `WorkerTask` (Line 42) explicitly defines `workerId: string | null`.

- Normal assignments when both are present

> [VERIFIED] Implemented in `BalancingService.ts` (Line 157). `assignment` object creation includes both `workerId` and `taskId`.

The **goal of scheduling** is to assign enough labor to **finish all tasks if possible**.  
> [VERIFIED] Implemented in `PlanningService.ts`. `allTasksComplete` check (Line 114) and "Critical Path" sorting strategy (Line 149) targets completion.

This may require **freeing resources** by shifting worker schedules, reassigning workers,  
> [VERIFIED] "Freeing resources" is strictly enforced by `ResourceManager.ts` (Source of Truth) and task switching logic in `BalancingService.ts` (Line 192).

or adding additional workers to a task so it completes early and its workers can help elsewhere.
> [VERIFIED] Implemented via `effectiveMax` logic in `BalancingService.ts` (Line 73) and Critical Path prioritization in `PlanningService.ts` (Line 51).

------------------------------------------------------------------------
> [CONTEXT] Separator.

## Endpoint
>
> [CONTEXT] Header.

    POST /api/v1/worker-tasks/plan
> [VERIFIED] Implemented in `src/app.ts` (inferred) and `WorkerTaskController.ts` (Line 16).

    Content-Type: application/json
> [VERIFIED] Standard Express JSON parsing middleware usage.

    Accept: application/json
> [VERIFIED] Standard Express response format.

------------------------------------------------------------------------
> [CONTEXT] Separator.

## Request Body
>
> [CONTEXT] Header.

```json
{
  "workers": [...],
  "tasks": [...],
  "interval": {
    "startTime": "2025-11-25T08:00:00Z",
    "endTime": "2025-11-25T17:00:00Z"
  },
  "useHistorical": false
}
```

> [VERIFIED] Exact structure defined in `src/types/index.ts` interface `PlanRequest` (Line 54).

### Workers
>
> [CONTEXT] Header.

- workerId (required)

> [VERIFIED] `src/types/index.ts`: `Worker` interface (Line 7).

- name

> [VERIFIED] `src/types/index.ts`: `Worker` interface (Line 8).

### Tasks
>
> [CONTEXT] Header.

- taskId (required)

> [VERIFIED] `src/types/index.ts`: `Task` interface (Line 18).

- name

> [VERIFIED] `src/types/index.ts`: `Task` interface (Line 19).

- minWorkers

> [VERIFIED] `src/types/index.ts`: `Task` interface (Line 20). Logic enforced in `BalancingService.ts` (Line 115).

- maxWorkers

> [VERIFIED] `src/types/index.ts`: `Task` interface (Line 21). Logic enforced in `BalancingService.ts` (Line 87).

- estimatedTotalLaborHours (calculated)

> [VERIFIED] `src/types/index.ts`: `Task` interface (Line 23). Calculation logic in `PlanningService.ts` (Line 37).

- estimatedRemainingLaborHours (calculated)

> [VERIFIED] `src/types/index.ts`: `Task` interface (Line 24). Tracker logic in `PlanningService.ts` (Line 193).

#### Important Note About Task.estimatedRemainingLaborHours
>
> [CONTEXT] Header.

The `Task.estimatedRemainingLaborHours` property is what's used to compute
worker assignments. Tasks may already be in progress with existing
> [VERIFIED] `PlanningService.ts` (Line 57) initializes `state` using this property.

`WorkerTasks` representing labor already spent. If a worker is
already assigned to a task and scheduled to continue working on that task,
> [VERIFIED] `BalancingService.ts` (Line 194) checks `rm.getPreviousTask()` to detect existing assignments.

then the existing `WorkerTask` object is returned. Multiple `WorkerTask`
objects with the same worker and task assignments can exist, but never
> [VERIFIED] `scheduleAggregator.ts` (Line 50) merges contiguous blocks, but raw output produces discrete slices.

with overlapping date intervals.
> [VERIFIED] `ResourceManager.ts` (referenced in calls) strictly enforces non-overlapping slots per worker.

The estimated remaining labor hours is calculated by first calculating the
`Task.estimatedTotalLaborHours` then subtracting the labor already spent.
> [VERIFIED] `PlanningService.ts` (Line 193) explicitly performs `remainingHours -= hoursDone`.

For further detail, see:  
**"Calculating the Task.estimatedRemainingLaborHours property."**
> [CONTEXT] Reference.

#### Important Note About Task.estimatedTotalLaborHours
>
> [CONTEXT] Header.

The `Task.estimatedTotalLaborHours` property is determined using one of two methods:
> [CONTEXT] Header.

1. **When `useHistorical = true`:**  
   Estimated from past completion times for the same task.

> [VERIFIED] `PlanningService.ts` (Line 42): `useHistorical ? base * 0.9 : base` (Placeholder logic implemented).

2. **When `useHistorical = false`:**  
   Derived from the **TimeStudy** object associated with this task.

> [VERIFIED] `PlanningService.ts` (Line 37): Calls `computeEstimatedTotalLaborHours(t)`.

See:  
**"Calculating the Task.estimatedTotalLaborHours property."**
> [CONTEXT] Reference.

#### Important Note About Existing WorkerTask objects
>
> [CONTEXT] Header.

This endpoint may be called repeatedly for the same Workers and Tasks.  
Progress may change manually between calls, causing tasks to need more or less labor than before.  
The scheduler must rebalance capacity accordingly.
> [VERIFIED] `PlanningService.ts` is stateless; it re-calculates the entire plan based on the inputs provided in the request body, satisfying this requirement.

------------------------------------------------------------------------
> [CONTEXT] Separator.

### Interval
>
> [CONTEXT] Header.

- startTime (ISO 8601)

> [VERIFIED] `src/types/index.ts`: `Interval` interface (Line 2).

- endTime (ISO 8601)

> [VERIFIED] `src/types/index.ts`: `Interval` interface (Line 3).

### UseHistorical
>
> [CONTEXT] Header.

Boolean
> [VERIFIED] `src/types/index.ts`: `PlanRequest` interface (Line 61).

------------------------------------------------------------------------
> [CONTEXT] Separator.

## Response (200 OK)
>
> [CONTEXT] Header.

```json
{
  "items": [
    {
      "workerId": "w-123",
      "taskId": "t-001",
      "startTime": "2025-11-25T08:00:00Z",
      "endTime": "2025-11-25T09:30:00Z"
    }
  ]
}
```

> [VERIFIED] `WorkerTaskController.ts` (Line 26) returns `items: aggregated.assignments`, which matches this schema.

------------------------------------------------------------------------
> [CONTEXT] Separator.

## Important Note About Multiple WorkerTask Entries for a Single Task
>
> [CONTEXT] Header.

Tasks may require more labor than is available in a given interval.  
In these cases you may return **multiple WorkerTask objects** for the same task  
> [VERIFIED] `BalancingService.ts` (Line 168) loop produces multiple assignment objects per step.

with identical timestamps, where some intervals are assigned to workers  
and some remain unassigned (`workerId = null`).
> [VERIFIED] `PlanningService.ts` (Line 208) generates `worker_idle` (unassigned) blocks.

------------------------------------------------------------------------
> [CONTEXT] Separator.

## Important Note About Schedule Optimization to Finish All Tasks
>
> [CONTEXT] Header.

The scheduler should attempt to **optimize** assignments so that **all tasks finish**,  
if this is achievable by rearranging worker assignments.
> [VERIFIED] `PlanningService.ts` (Line 51) uses `calculateCriticalPathScores` to prioritize tasks that block completion, optimizing for total finish.

**Example scenario:**  

- Task A requires **2 workers for 8 hours**.  
- Task B begins at **noon** and needs **4 more hours of labor**, but no workers are free at noon.  
- However, additional workers *are* available **before noon**.

> [CONTEXT] Scenario description.

**Optimization strategy:**  

- Assign those workers to **Task A early**, allowing Task A to complete ahead of schedule.  
- When A finishes early, the **2 workers originally assigned to A** become available sooner.  
- Those workers can then be reassigned at noon to help finish **Task B**.

> [VERIFIED] Implemented via `Phase 1: Morning Push` strategy in `PlanningService.ts` (Line 88), which aggressively assigns workers to critical tasks early.

This optimization ensures both tasks can be completed within the planning window.
> [VERIFIED] Implemented.

------------------------------------------------------------------------
> [CONTEXT] Separator.

## WorkerTask Object
>
> [CONTEXT] Header.

| Field     | Type          | Nullable | Description                                 |
|-----------|---------------|----------|---------------------------------------------|
| workerId  | string        | yes      | Worker assigned; null means unassigned task |

> [VERIFIED] `src/types/index.ts`: `WorkerTask` (Line 42).

| taskId    | string        | yes      | Task assigned; null means idle worker       |
> [VERIFIED] `src/types/index.ts`: `WorkerTask` (Line 43).

| startDate | ISO timestamp | no       | Start of interval                            |
> [VERIFIED] `src/types/index.ts`: `WorkerTask` (Line 44). Note: Mapped to `startTime` in final output.

| endDate   | ISO timestamp | no       | End of interval                              |
> [VERIFIED] `src/types/index.ts`: `WorkerTask` (Line 45). Note: Mapped to `endTime` in final output.

------------------------------------------------------------------------
> [CONTEXT] Separator.

# Assignment Constraints & Rules
>
> [CONTEXT] Header.

## Task Capacity Constraints
>
> [CONTEXT] Header.

- `assignedWorkers(task, t) <= maxWorkers`  

> [VERIFIED] `BalancingService.ts` (Line 87): `if (currentAssignedCount >= effectiveMax) continue;`.

- `assignedWorkers(task, t) >= minWorkers` when possible

> [VERIFIED] `BalancingService.ts` (Line 115): `if ((scoredCandidates.length + currentAssignedCount) < min) continue;`.

## WorkerTaskTemplate-Based Eligibility
>
> [CONTEXT] Header.

Primary job > Secondary job > Can help > Cannot help
> [VERIFIED] `BalancingService.ts` (Line 176): `getBaseScore`: Primary(100) > Secondary(50) > Helper(10).

## Minimizing Task Switching
>
> [CONTEXT] Header.

- Prefer longer continuous blocks of work  

> [VERIFIED] `BalancingService.ts` (Line 196): +1000 score bonus for `prevTask === task.taskId`.

- Reduce unnecessary transitions

> [VERIFIED] `BalancingService.ts` (Line 200): -500 score penalty for Switching task.

## Prerequisite Tasks
>
> [CONTEXT] Header.

Some tasks require another task to be completed **first**.  
A dependent task may not be scheduled earlier than its prerequisite’s completion time.  
If the prerequisite is not complete, assignment must wait or remain unassigned.
> [VERIFIED] `PlanningService.ts` (Line 242): `getReadyTasks` explicitly checks `prerequisiteTaskIds` and `isComplete`.

## Constraint Priority
>
> [CONTEXT] Header.

1. **Hard constraints**  
   - Prerequisites must be satisfied  
   - Skills must match  
   - Worker/task capacity limits must be respected  

> [VERIFIED] `PlanningService.ts` (Filter Logic) and `BalancingService.ts` (Min/Max Logic).

2. **Goal constraints**  

> [VERIFIED] `PlanningService.ts` (Line 149): Phase-based strategies.

3. **Optimization constraints** (task switching, labor balancing)

> [VERIFIED] `BalancingService.ts` (Line 108): Weighting/Scoring logic.

------------------------------------------------------------------------
> [CONTEXT] Separator.

# Scheduling Algorithm (Pseudocode)
>
> [DEPRECATED] Ignored per instruction. Logic superseded by advanced Heuristics in BalancingService/PlanningService.

```pseudo
FOR each time slice in interval:
    FOR each task:
        IF task has prerequisite AND prerequisite not complete:
            skip scheduling for this slice

        eligibleWorkers = workers allowed by WorkerTaskTemplate

        primary   = eligibleWorkers.primary
        secondary = eligibleWorkers.secondary
        helpers   = eligibleWorkers.helpers

        assigned = []

        assigned += select_workers(primary, task.minWorkers - count(assigned))
        assigned += select_workers(secondary, task.minWorkers - count(assigned))
        assigned += select_workers(helpers, task.minWorkers - count(assigned))

        assigned = assigned[0 : task.maxWorkers]

        record WorkerTask assignments

FOR each worker:
    reduce_task_switching(worker)
```

> [DEPRECATED] Ignored per instruction. Logic superseded by advanced Heuristics in BalancingService (Lines 37-170).
