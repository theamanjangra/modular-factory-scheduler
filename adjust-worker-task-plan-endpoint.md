# REST Endpoint Documentation

## Adjust Worker Task Assignments for an Existing Plan

------------------------------------------------------------------------

## Summary

Recomputes worker↔task assignments for an **existing plan** using new
operational data that accumulates after production begins:

-   **TaskProgressUpdates** --- Labor-hours adjustments per task (net
    sum)
-   **TaskInterruptions** --- Time intervals when a task cannot be
    worked
-   **WorkerScheduleConstraints** --- Time intervals when a worker
    cannot be scheduled

This endpoint:

1.  Loads the plan context (tasks, workers, interval, and existing
    assignments)
2.  Retrieves relevant progress updates and schedule constraints
3.  Recomputes adjusted remaining labor hours
4.  Applies task and worker unavailability constraints
5.  Re-optimizes the schedule
6.  Returns added, updated, and deleted `WorkerTask` and `DeficitTask`
    records

------------------------------------------------------------------------

## Endpoint

POST `/api/v1/plans/{planId}/worker-tasks/adjust`

Content-Type: application/json\
Accept: application/json

------------------------------------------------------------------------

## Parameters

### Path Parameters

-   `planId` (string, required)\
    Identifier for the plan whose worker tasks should be adjusted.

------------------------------------------------------------------------

## Request Body

None.

All required data is derived from the database using the provided
`planId`.

------------------------------------------------------------------------

# Data Sources Used

## 1. Existing Plan Data

-   Planning interval (startTime / endTime)
-   Tasks within scope
-   Workers within scope
-   Existing `WorkerTask` assignments
-   Existing `DeficitTask` records

------------------------------------------------------------------------

## 2. TaskProgressUpdates

Each record contains:

-   `taskId`
-   `laborHoursAdjustment` (positive or negative)
-   `createdAt`

### Net Adjustment Calculation

    netLaborHoursAdjustment(task) =
      SUM(TaskProgressUpdates.laborHoursAdjustment WHERE taskId = task.id)

------------------------------------------------------------------------

## 3. TaskInterruptions

Each record contains:

-   `taskId`
-   `startDate`
-   `endDate` (optional)

Meaning:

-   Task cannot be worked during `[startDate, endDate)`
-   If `endDate` is null → task cannot be worked from `startDate` onward

------------------------------------------------------------------------

## 4. WorkerScheduleConstraints

Each record contains:

-   `workerId`
-   `startDate`
-   `endDate` (optional)

Meaning:

-   Worker cannot be scheduled during `[startDate, endDate)`
-   If `endDate` is null → worker unavailable from `startDate` onward

------------------------------------------------------------------------

# Adjusted Remaining Labor Hours

## Step 1 --- Compute Base Remaining Labor

    baseRemaining =
      max(0, estimatedTotalLaborHours - totalElapsedTime)

Where:

-   `estimatedTotalLaborHours` is calculated from time studies or
    historical data
-   `totalElapsedTime` is computed from existing WorkerTask intervals
-   If a WorkerTask has `endDate = null`, use `now() - startDate`

------------------------------------------------------------------------

## Step 2 --- Apply Progress Updates

    adjustedRemaining =
      max(0, baseRemaining + netLaborHoursAdjustment)

This ensures remaining labor never becomes negative.

------------------------------------------------------------------------

# Scheduling Rules

## Core Rules (unchanged)

-   Respect task minWorkers / maxWorkers
-   Respect skill eligibility tiers
-   Respect prerequisite tasks
-   Minimize unnecessary task switching
-   Attempt to finish all tasks within interval

## Additional Hard Constraints

### Task Interruptions

No work may be scheduled during interruption intervals.

### Worker Schedule Constraints

No worker may be scheduled during unavailable intervals.

Open-ended intervals are treated as lasting until the end of the
planning window.

------------------------------------------------------------------------

# Response (200 OK)

    {
      "workerTasks": {
        "added":   [ ... ],
        "updated": [ ... ],
        "deleted": [ ... ]
      },
      "deficitTasks": {
        "added":   [ ... ],
        "updated": [ ... ],
        "deleted": [ ... ]
      }
    }

------------------------------------------------------------------------

## WorkerTask Object

  -----------------------------------------------------------------------
  Field           Type                  Nullable       Description
  --------------- --------------------- -------------- ------------------
  workerId        string                yes            Assigned worker
                                                       (null = unassigned
                                                       task labor)

  taskId          string                yes            Assigned task
                                                       (null = idle
                                                       worker)

  startDate       ISO timestamp         no             Interval start

  endDate         ISO timestamp         no             Interval end
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# Operational Flow

1.  Initial plan created after assembly cycle.
2.  Production begins.
3.  TaskProgressUpdates, TaskInterruptions, and
    WorkerScheduleConstraints accumulate.
4.  On a recurring cadence (e.g., every 2 hours), call this endpoint.
5.  Apply returned diffs to persist the updated schedule.

------------------------------------------------------------------------

# Implementation Notes

-   Scope all queries by `planId`.
-   Avoid double-applying progress updates.
-   Preserve already-spent labor calculations.
-   Clamp all labor calculations at zero.
-   Validate all prerequisite and capacity constraints before
    assignment.
