# REST Endpoint Documentation
## Generate Worker Task Assignments

### Summary

Computes which workers are assigned to which tasks over a given time
interval with given remaining labor hours needed to complete the tasks, 
and returns `WorkerTask` entries that also represent gaps:

- Workers with **no task** (`taskId = null`)
- Tasks with **no worker** (`workerId = null`)
- Normal assignments when both are present

The **goal of scheduling** is to assign enough labor to **finish all tasks if possible**.  
This may require **freeing resources** by shifting worker schedules, reassigning workers,  
or adding additional workers to a task so it completes early and its workers can help elsewhere.

------------------------------------------------------------------------

## Endpoint

    POST /api/v1/worker-tasks/plan
    Content-Type: application/json
    Accept: application/json

------------------------------------------------------------------------

## Request Body

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

### Workers

- workerId (required)
- name

### Tasks

- taskId (required)
- name
- minWorkers
- maxWorkers
- estimatedTotalLaborHours (calculated)
- estimatedRemainingLaborHours (calculated)

#### Important Note About Task.estimatedRemainingLaborHours

The `Task.estimatedRemainingLaborHours` property is what's used to compute
worker assignments. Tasks may already be in progress with existing
`WorkerTasks` representing labor already spent. If a worker is
already assigned to a task and scheduled to continue working on that task,
then the existing `WorkerTask` object is returned. Multiple `WorkerTask`
objects with the same worker and task assignments can exist, but never
with overlapping date intervals.

The estimated remaining labor hours is calculated by first calculating the
`Task.estimatedTotalLaborHours` then subtracting the labor already spent.

For further detail, see:  
**"Calculating the Task.estimatedRemainingLaborHours property."**

#### Important Note About Task.estimatedTotalLaborHours

The `Task.estimatedTotalLaborHours` property is determined using one of two methods:

1. **When `useHistorical = true`:**  
   Estimated from past completion times for the same task.

2. **When `useHistorical = false`:**  
   Derived from the **TimeStudy** object associated with this task.

See:  
**"Calculating the Task.estimatedTotalLaborHours property."**

#### Important Note About Existing WorkerTask objects

This endpoint may be called repeatedly for the same Workers and Tasks.  
Progress may change manually between calls, causing tasks to need more or less labor than before.  
The scheduler must rebalance capacity accordingly.

------------------------------------------------------------------------

### Interval

- startTime (ISO 8601)
- endTime (ISO 8601)

### UseHistorical

Boolean

------------------------------------------------------------------------

## Response (200 OK)

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

------------------------------------------------------------------------

## Important Note About Multiple WorkerTask Entries for a Single Task

Tasks may require more labor than is available in a given interval.  
In these cases you may return **multiple WorkerTask objects** for the same task  
with identical timestamps, where some intervals are assigned to workers  
and some remain unassigned (`workerId = null`).

------------------------------------------------------------------------

## Important Note About Schedule Optimization to Finish All Tasks

The scheduler should attempt to **optimize** assignments so that **all tasks finish**,  
if this is achievable by rearranging worker assignments.

**Example scenario:**  
- Task A requires **2 workers for 8 hours**.  
- Task B begins at **noon** and needs **4 more hours of labor**, but no workers are free at noon.  
- However, additional workers *are* available **before noon**.

**Optimization strategy:**  
- Assign those workers to **Task A early**, allowing Task A to complete ahead of schedule.  
- When A finishes early, the **2 workers originally assigned to A** become available sooner.  
- Those workers can then be reassigned at noon to help finish **Task B**.

This optimization ensures both tasks can be completed within the planning window.

------------------------------------------------------------------------

## WorkerTask Object

| Field     | Type          | Nullable | Description                                 |
|-----------|---------------|----------|---------------------------------------------|
| workerId  | string        | yes      | Worker assigned; null means unassigned task |
| taskId    | string        | yes      | Task assigned; null means idle worker       |
| startDate | ISO timestamp | no       | Start of interval                            |
| endDate   | ISO timestamp | no       | End of interval                              |

------------------------------------------------------------------------

# Assignment Constraints & Rules

## Task Capacity Constraints

- `assignedWorkers(task, t) <= maxWorkers`  
- `assignedWorkers(task, t) >= minWorkers` when possible

## WorkerTaskTemplate-Based Eligibility

Primary job > Secondary job > Can help > Cannot help

## Minimizing Task Switching

- Prefer longer continuous blocks of work  
- Reduce unnecessary transitions

## Prerequisite Tasks

Some tasks require another task to be completed **first**.  
A dependent task may not be scheduled earlier than its prerequisite’s completion time.  
If the prerequisite is not complete, assignment must wait or remain unassigned.

## Constraint Priority

1. **Hard constraints**  
   - Prerequisites must be satisfied  
   - Skills must match  
   - Worker/task capacity limits must be respected  
2. **Goal constraints**  
3. **Optimization constraints** (task switching, labor balancing)

------------------------------------------------------------------------

# Scheduling Algorithm (Pseudocode)

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
