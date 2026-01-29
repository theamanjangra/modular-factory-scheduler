# REST Endpoint Documentation
## Balance task demand and worker capacity

### Summary

Takes a mixed set of `WorkerTask` objects — some missing a `workerId` (unfilled task demand) and some missing a `taskId` (available worker capacity) — and attempts to assign workers to tasks based on **skill compatibility**, **ranked skill matching**, **time interval overlap**, and **task-switching minimization**.

Returned `WorkerTask` entries may:

- have **both** worker and task assigned (successful match)
- have **null workerId** when no qualified worker is available
- have **null taskId** when a worker remains idle
- include **multiple entries for the same task** during a time window when worker availability only covers part of the required time

---

## Endpoint

```
POST /api/v1/worker-tasks/match
Content-Type: application/json
Accept: application/json
```

---

## Request Body

```json
{
  "workerTasks": [...],
  "workers": [...],
  "tasks": [...]
}
```

### WorkerTasks

Each WorkerTask defines an interval where either:

- `workerId != null` and `taskId = null` → a worker is **available**
- `workerId = null` and `taskId != null` → a task **needs labor**
- **never** both null

Properties:

- workerId (nullable, but not if taskId is null)
- taskId (nullable, but not if workerId is null)
- startDate (ISO 8601)
- endDate (ISO 8601)

### Workers

- workerId (required)
- skills (array of strings, ranked by competence — highest competence first)

### Tasks

- taskId (required)
- requiredSkills (array of strings, ranked by importance — highest importance first)

#### Important Note About Skill Eligibility

A worker may be assigned to a task **only if**:

```
worker.skills contains all task.requiredSkills
```

This is a **hard constraint** — mismatched skills automatically disqualify the worker.

#### Important Note About Skill Ranking and Match Quality

To optimize assignments:

- If a task’s *highest-ranked skill* matches a worker’s *highest-ranked skill*, this is a **strong match**.
- If that task skill matches near the bottom of the worker’s skill list, it is a **possible but suboptimal** match.
- The matching process attempts to prefer stronger skill alignments before weaker ones.

---

## Important Note About Minimizing Task Switching

When multiple matches are possible:

- The system attempts to **keep workers on the same task** across adjacent time intervals.
- Existing assignments are honored where possible.
- Only when necessary will workers switch tasks.

This is a **secondary optimization**, after skill compatibility and match quality.

---

## Response (200 OK)

```json
{
  "workerTasks": [
    {
      "workerId": "W123",
      "taskId": "T456",
      "startDate": "2025-02-01T09:00:00Z",
      "endDate": "2025-02-01T12:00:00Z"
    }
  ]
}
```

---

## Important Note About Multiple WorkerTask Entries for a Single Task

You may return **multiple `WorkerTask` objects for a single task covering the same time interval**, where:

- Some intervals **have workers assigned**
- Some intervals have `workerId = null` because no worker was available

This occurs naturally when:

- A task spans a long interval  
- Worker availability covers only part of that time  
- The task requires more labor hours than workers can provide during the window  

**Example scenario:**  
A task requires 8 hours of labor, but the only available worker is present for 4 hours.

Result:

1. `WorkerTask` for assigned worker  
2. `WorkerTask` with `workerId = null` for the uncovered remainder  

This pattern is expected and valid in assignment results.

---

## WorkerTask Object

| Field       | Type          | Nullable | Description |
|-------------|---------------|----------|-------------|
| workerId    | string        | yes      | Worker assigned; null means unstaffed task interval |
| taskId      | string        | yes      | Task assigned; null means idle worker interval |
| startDate   | ISO timestamp | no       | Start of interval |
| endDate     | ISO timestamp | no       | End of interval |

> **workerId and taskId may not both be null.**

---

# Assignment Constraints & Rules

## Skill Eligibility Rules

- Worker must contain **all** required skills for the task.
- Required skills are ranked by importance.
- Worker skills are ranked by competence.
- Stronger matches (top-ranked skill matches) are prioritized.

## Skill Ranking Optimization

- Ideal match: task’s highest-ranked skill appears early in worker.skill list.
- Acceptable match: it appears later.
- Matching algorithm scores matches and chooses highest-scoring candidates first.

## Time Overlap Constraints

Assignments are only possible where worker availability overlaps with task-needed intervals.

## Minimizing Task Switching

- Prefer to keep a worker on the same task across adjacent intervals.
- Reduce unnecessary worker movement when equal-scoring matches exist.

## Constraint Priority

1. Hard constraints  
2. Goal constraints  
3. Secondary optimization  

---

# Matching Algorithm (Pseudocode)

```pseudo
FOR each unassigned task interval (workerId = null):
    collect all workers with overlapping availability intervals
    filter workers by skill eligibility (must contain all required skills)
    IF no eligible workers:
        output WorkerTask with workerId = null
        continue

    score each eligible worker:
        score = skill_alignment_score(task.requiredSkills, worker.skills)
               + task_switching_penalty(worker, task)

    select best-scoring worker

    split interval if needed to match overlapping availability
    output WorkerTask(workerId = selectedWorker, taskId, matched_start, matched_end)

    reduce worker’s available time window accordingly

FOR each unassigned worker interval (taskId = null):
    output WorkerTask unchanged (worker idle)
```

