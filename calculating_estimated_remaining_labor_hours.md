
# Calculating `Task.estimatedRemainingLaborHours`

## Overview

A `WorkerTask` object represents a block of time during which a worker is assigned to a specific task.  
Each `WorkerTask` contains:

- `workerId`
- `taskId`
- `startDate`
- `endDate` (may be null if still in progress)

By aggregating these work intervals, you can determine:

- **How much time has already been spent** on the task  
- **How much time remains** based on the task's `estimatedTotalLaborHours` value

This document describes how to compute `Task.estimatedRemainingLaborHours`.

---

## Step 1 — Retrieve WorkerTask Records for the Task

Query all `WorkerTask` objects where:

```
taskId = <target task ID>
```

A task may have multiple workers and multiple work intervals.

---

## Step 2 — Compute Elapsed Time for Each WorkerTask

For each `WorkerTask`:

### If `endDate` is **not null**
```
elapsed = endDate - startDate
```

### If `endDate` **is null** (work still in progress)
```
elapsed = now() - startDate
```

Convert the result to hours (or your system’s standard time unit).

---

## Step 3 — Sum All Elapsed Durations

```
totalElapsedTime = sum(elapsed_time_for_each_WorkerTask)
```

This yields the total labor hours already performed on the task across all workers.

---

## Step 4 — Retrieve `Task.estimatedTotalLaborHours`

This value is calculated using module attributes, task templates, and time studies.  
See related documentation:

**“Calculating the Task.estimatedDuration property.”**

For this calculation, the value represents:

```
estimatedTotalLaborHours = total hours required to fully complete the task
```

---

## Step 5 — Calculate Estimated Remaining Labor Hours

```
estimatedRemainingLaborHours = estimatedTotalLaborHours - totalElapsedTime
```

### Important:

- If the result is **negative**, clamp to `0`
  ```
  estimatedRemainingLaborHours = max(0, estimatedRemainingLaborHours)
  ```

- This result represents the **remaining effort**, not remaining calendar time.

---

## Example

### WorkerTask records:

| workerId | taskId | startDate           | endDate             |
|----------|--------|----------------------|----------------------|
| W1       | T500   | 2025-02-01T08:00:00Z | 2025-02-01T12:00:00Z |
| W1       | T500   | 2025-02-01T13:00:00Z | *null* (still working) |
| W2       | T500   | 2025-02-01T09:00:00Z | 2025-02-01T11:00:00Z |

Assume current time = **2025‑02‑01T17:00:00Z**.

### Calculations:

- W1 interval 1 → 4 hours  
- W2 interval 1 → 2 hours  
- W1 interval 2 → now − 13:00 → 4 hours  

```
totalElapsedTime = 4 + 2 + 4 = 10 hours
```

### Estimated total labor hours from time study:

```
estimatedTotalLaborHours = 22 hours
```

### Remaining labor hours:

```
estimatedRemainingLaborHours = 22 − 10 = 12 hours
```

---

## Summary

To compute `Task.estimatedRemainingLaborHours`:

1. Retrieve all WorkerTask records for the task  
2. Compute elapsed time for each  
3. Sum the elapsed durations  
4. Subtract this from `Task.estimatedTotalLaborHours`  
5. Clamp at zero if negative  

This method supports:

- Multi-worker tasks  
- Tasks worked in multiple intervals  
- Ongoing in-progress tasks  
- Accurate burn-down calculations  

