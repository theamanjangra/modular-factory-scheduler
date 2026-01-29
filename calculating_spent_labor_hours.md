
# Calculating the `Task.spentLaborHours` Property

## Overview

A `WorkerTask` object represents **when a worker is assigned to a task**.  
Each record covers a continuous block of time during which a worker is actively working on that task.

A `WorkerTask` has the following properties:

- `workerId`
- `taskId`
- `startDate`
- `endDate` (may be null if the work is still in progress)

---

## Purpose

To determine **how much time has been spent on a task**, aggregate all time intervals recorded in its associated `WorkerTask` objects.

---

## Data Model

### `WorkerTask` Object

| Field       | Type                | Description |
|-------------|---------------------|-------------|
| `workerId`  | string              | ID of the worker performing the work |
| `taskId`    | string              | ID of the task being worked on |
| `startDate` | datetime (ISO 8601) | Start of the work interval |
| `endDate`   | datetime (ISO 8601 or null) | End of the work interval; null means work is still active |

A single task may have **multiple workers** and **multiple intervals** of work.

---

## Calculating Total Time Spent on a Task

### Step 1 — Retrieve all WorkerTask records for the task

Query all `WorkerTask` entries where `taskId = <target task ID>`.

### Step 2 — Compute elapsed time for each record

For each entry:

- If `endDate` is **not null**:  
  ```
  elapsed = endDate - startDate
  ```
- If `endDate` **is null** (work is still in progress):  
  ```
  elapsed = now() - startDate
  ```

Use consistent units—hours, minutes, or seconds—depending on your system.

### Step 3 — Sum all elapsed durations

Add together all elapsed times from all workers:

```
totalTimeSpent = sum(elapsed_time_for_each_WorkerTask)
```

The result is the **total time invested in the task**, across all workers and all work intervals.

---

## Example

| workerId | taskId | startDate           | endDate             |
|----------|--------|----------------------|----------------------|
| W1       | T100   | 2025-01-10T08:00:00Z | 2025-01-10T12:00:00Z |
| W2       | T100   | 2025-01-10T09:00:00Z | 2025-01-10T11:00:00Z |
| W1       | T100   | 2025-01-10T13:00:00Z | *null* (still working) |

Calculated:

- W1 interval 1 → **4 hours**
- W2 interval 1 → **2 hours**
- W1 interval 2 → **now − 13:00** (if now = 17:00 → **4 hours**)

Total:

```
4 + 2 + 4 = 10 hours
```

---

## Summary

To compute time spent on a task:

1. Collect all `WorkerTask` records for the task  
2. Compute elapsed time for each record  
3. Sum the durations  
4. The result is the **total work time** spent on that task

This method works automatically for:

- Partial work  
- Multiple workers  
- Long-running tasks with ongoing work  
- Tasks where work happens in multiple intervals  

