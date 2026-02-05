# REST API — Generate Production Plan

This document specifies a REST endpoint that **generates and persists a `ProductionPlan`** for an assembly-line **cycle** by:
- collecting all required work (`Task`) from **current** Travelers in stations,
- constructing the relevant `ProductionPlanShift` records for a requested time window,
- invoking a scheduling algorithm to assign Workers to Tasks (`WorkerTask`) and identify unmet work (`DeficitTask`),
- and saving the full resulting plan graph.

> **Important:** Object properties shown in this document are **partial**. Refer to your data-model documentation for full schemas.

---

## Domain concepts

### Cycle
A **cycle** includes all work that must be completed across all stations before modules can move forward to the next station.

### Traveler
A **Traveler** is an electronic record that follows each module as it moves station-to-station and contains the Tasks/inspections required at each station.  
To execute work at a station, the system checks the Traveler to determine what Tasks must be performed.

### ProductionPlan
A **ProductionPlan** is a schedule of all work required to complete a cycle, optimized for labor efficiency. It contains:
- a time window (`startDate`, `endDate`)
- the chosen boundary shifts (`startShift`, `endShift`)
- a set of `ProductionPlanShift` records that hold the scheduled assignments (`WorkerTask`) and any deficits (`DeficitTask`)

---

## Endpoint

### Generate and save a production plan

`POST /api/v1/production-plans:generate`

Generates a new ProductionPlan for the requested interval and number of shifts, runs the scheduling algorithm, and **persists**:
- `ProductionPlan`
- `ProductionPlanShift[]`
- `WorkerTask[]`
- `DeficitTask[]`

#### Authentication
**Required** (recommended): `Authorization: Bearer <token>`

#### Idempotency (recommended)
Because this endpoint creates records, clients SHOULD send:

`Idempotency-Key: <unique-string>`

If the server receives the same key with the same request payload, it SHOULD return the previously created plan (or an equivalent idempotent response).

---

## Request

### Headers

| Header | Required | Example |
|---|---:|---|
| `Content-Type` | ✅ | `application/json` |
| `Authorization` | ✅ (typical) | `Bearer <token>` |
| `Idempotency-Key` | ⛔ (recommended) | `7d2b3e30-3cb5-4f4c-9f45-4c3c51d1f7d1` |

### Body (JSON)

```json
{
  "startDate": "2026-02-02T07:00:00Z",
  "endDate": "2026-02-05T07:00:00Z",
  "numberOfShifts": 6
}
```

#### Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `startDate` | ISO-8601 timestamp | ✅ | Start of the work window. Recommended: **inclusive**. |
| `endDate` | ISO-8601 timestamp | ✅ | End of the work window. Recommended: **exclusive** (`[startDate, endDate)`). Must be after `startDate`. |
| `numberOfShifts` | integer | ✅ | Number of shift occurrences to include in the plan. Must be `>= 1`. |

### Validation rules (recommended)

- `startDate < endDate`
- `numberOfShifts >= 1`
- Shift templates must never overlap (configuration invariant)
- The system must be able to compute at least `numberOfShifts` shift occurrences inside the requested window
  - otherwise return `409 Conflict`

---

## Response

### 201 Created

Returns the full persisted plan graph.

```json
{
  "productionPlan": {
    "id": "0a4fcb54-0a34-4b9e-b7ae-1d31a9b1c8e0",
    "startDate": "2026-02-02T07:00:00Z",
    "endDate": "2026-02-05T07:00:00Z",
    "startShift": {
      "id": "9a5d25db-0f52-4a6e-835d-0f8f22e2b98c",
      "startTime": 25200,
      "endTime": 54000,
      "weekDayOrdinal": 1
    },
    "endShift": {
      "id": "0b7c7d1f-86f1-4d0d-bf34-8d2f2c56d4ac",
      "startTime": 25200,
      "endTime": 54000,
      "weekDayOrdinal": 4
    }
  },
  "productionPlanShifts": [
    {
      "id": "3b1d704b-8b8c-4c73-8e1a-1d8c9d4d6a1f",
      "shift": {
        "id": "9a5d25db-0f52-4a6e-835d-0f8f22e2b98c",
        "startTime": 25200,
        "endTime": 54000,
        "weekDayOrdinal": 1
      },
      "workerTasks": [
        {
          "id": "f4e1b1d8-2f74-4f86-9a4a-92d2e6f9d933",
          "worker": {
            "id": "7b6b4dc1-1f6b-4d23-9e77-0ce8a9d2a2c5",
            "department": { "id": "1b5d2a2a-0a0f-4b61-a39b-5f4f1c7c8d10" }
          },
          "task": { "id": "d6f7c2f7-1b8f-4b9b-a3d0-2bf0b9c1c2aa" },
          "startDate": "2026-02-02T07:15:00Z",
          "endDate": "2026-02-02T08:00:00Z"
        }
      ],
      "deficitTasks": [
        {
          "id": "3d4b8a6c-6b12-4b6c-a9d3-5fd51e40c3e9",
          "task": { "id": "a9a1e2b2-7a1f-4b9c-81d1-2f1c0c2a9c21" },
          "deficitHours": 1.5
        }
      ]
    }
  ]
}
```

> The response shape above is illustrative and may be adapted to match your API conventions (e.g., embedding shifts under the plan vs. returning separate top-level arrays).

---

## Server-side behavior


### Scheduling algorithm invocation (internal)

The term **“algorithm”** in this document refers to an **internal backend scheduling function**.

- The client does **not** select or pass an algorithm to this endpoint.
- The endpoint itself determines which scheduling implementation to invoke.
- The algorithm is called **server-side** after all required data has been assembled.

From the perspective of API consumers, the scheduling algorithm is an implementation detail.


### What the endpoint provides to the scheduling algorithm

The endpoint builds and passes:

- `tasks: [Task]` — all tasks to be performed in the factory for current Travelers
- `productionPlanShifts: [ProductionPlanShift]` — one per included shift occurrence
- `startTimestamp: startDate`
- `endTimestamp: endDate`

### What the algorithm returns

The algorithm returns updated `ProductionPlanShift` objects containing:

- `workerTasks: [WorkerTask]` — the assignment schedule
- `deficitTasks: [DeficitTask]` — tasks that cannot be completed due to insufficient staffing

### What the endpoint persists

After algorithm completion, the endpoint saves:

- `ProductionPlan`
- `ProductionPlanShift[]`
- `WorkerTask[]`
- `DeficitTask[]`

> Recommended: persist all records in a single transaction.

---


## Data assembly details

### How to get the data needed by the algorithm

The endpoint is responsible for assembling all required inputs before invoking the scheduling algorithm.

---

### 1) Build the `[Task]` list from current Travelers

**Goal:** gather all tasks that must be performed in the factory based on modules currently present in stations.

#### Steps

1. Fetch all `TravelerStation` records where `isCurrent == true`.
2. From these records, collect all `travelerId` values.
3. Fetch the corresponding `Traveler` records using those IDs.
4. Fetch all `Task` records where `Task.travelerId` is **one of** the collected traveler IDs.

**Result:** a complete `[Task]` list representing all work currently required in the factory.

---

### 2) Construct `[ProductionPlanShift]` instances from Shift occurrences

**Goal:** create one `ProductionPlanShift` instance for each **occurrence** of a shift used in the plan window.

#### Shift definitions (important)

- `Shift` objects are **singletons**.
- A `Shift` defines a **template**:
  - start time
  - end time
  - weekday ordinal
- Shift schedules (start/end times) must **never overlap**.
- In practice, there may be only **one** Shift definition.
- The system will never use more than **three** Shift definitions.

> **Important distinction:**  
> The `numberOfShifts` parameter passed to this endpoint refers to the number of **shift occurrences**, **not** the number of `Shift` objects.

#### Steps

1. Fetch all `Shift` definitions.
2. For each Shift, compute its concrete **occurrences** that fall within the provided date interval:
   - `[startDate, endDate)` (recommended)
   - An occurrence represents that Shift happening on a specific calendar date.
3. Combine and sort all occurrences chronologically.
4. Select up to `numberOfShifts` total occurrences.
5. For each selected occurrence:
   - create a new `ProductionPlanShift` instance
   - associate it with:
     - the newly created `ProductionPlan`
     - the corresponding `Shift` singleton
   - initialize with empty:
     - `workerTasks`
     - `deficitTasks`

**Result:** an ordered list of `[ProductionPlanShift]` instances representing the working time slots available to the algorithm.

---

### 3) Time window inputs

- `startDate`
  - Provided directly in the endpoint request.
  - Used as the lower bound for valid shift occurrences and scheduling.
- `endDate`
  - Provided directly in the endpoint request.
  - Used as the upper bound for valid shift occurrences and scheduling.

---


---


### 2) Construct `[ProductionPlanShift]` for the window and shift count

**Goal:** create one `ProductionPlanShift` per included shift occurrence.

#### Shift master data

Fetch all `Shift` templates. A `Shift` includes:
- `startTime` — `TimeInterval` (seconds from midnight)
- `endTime` — `TimeInterval` (seconds from midnight)
- `weekDayOrdinal` — integer weekday marker (define mapping; e.g., 1=Mon..7=Sun)

**Invariant:** Shift schedules should never overlap.

#### Steps

1. From the shift templates, compute all concrete shift occurrences that fall within `[startDate, endDate)` (recommended).
2. Sort occurrences in chronological order.
3. Select the first `numberOfShifts` occurrences.
4. For each selected occurrence:
   - create a new `ProductionPlanShift` with:
     - `plan` = the new ProductionPlan
     - `shift` = the shift template used
     - `workerTasks` and `deficitTasks` = empty arrays initially

**Result:** an initial `[ProductionPlanShift]` list (empty schedule) to pass into the algorithm.

---

## Persistence and integrity

### Recommended transaction boundary

Within a database transaction:

1. Insert new `ProductionPlan`
2. Insert new `ProductionPlanShift[]` (FK to plan)
3. Insert new `WorkerTask[]` (FK to plan shift, FK to worker, optional FK to task)
4. Insert new `DeficitTask[]` (FK to plan shift, FK to task)

Rollback on any failure.

### Concurrency notes (recommended)

- Prefer `Idempotency-Key` to prevent duplicate plan creation.
- Consider preventing multiple active plans for the same `[startDate, endDate)` if your business rules require uniqueness (return `409 Conflict`).

---

## Error responses

### 400 Bad Request — validation errors

```json
{
  "error": "VALIDATION_ERROR",
  "message": "startDate must be before endDate",
  "details": {
    "startDate": "2026-02-05T07:00:00Z",
    "endDate": "2026-02-02T07:00:00Z"
  }
}
```

### 401 Unauthorized / 403 Forbidden

```json
{
  "error": "UNAUTHORIZED",
  "message": "Missing or invalid access token."
}
```

### 409 Conflict — shift coverage or configuration issues

```json
{
  "error": "SHIFT_WINDOW_CONFLICT",
  "message": "Only 4 shift occurrences fall within the requested window; numberOfShifts=6.",
  "details": {
    "availableShiftOccurrences": 4,
    "numberOfShifts": 6
  }
}
```

Also use `409` if shift templates overlap (configuration violates invariant).

### 422 Unprocessable Entity — algorithm/data inconsistency

```json
{
  "error": "SCHEDULING_FAILED",
  "message": "Scheduling algorithm could not produce a valid plan from the provided data.",
  "details": {
    "reason": "Missing department on one or more tasks."
  }
}
```

### 500 Internal Server Error

```json
{
  "error": "INTERNAL_ERROR",
  "message": "Unexpected server error."
}
```

---

## Object model (partial)

### ProductionPlan

```swift
struct ProductionPlan {
    var id: UUID
    var startDate: Date
    var endDate: Date
    var startShift: Shift
    var endShift: Shift
}
```

### Shift

```swift
struct Shift {
    var id: UUID
    var startTime: TimeInterval
    var endTime: TimeInterval
    var weekDayOrdinal: Int
}
```

### ProductionPlanShift

```swift
struct ProductionPlanShift {
    var id: UUID
    var plan: ProductionPlan
    var shift: Shift
    var workerTasks: [WorkerTask]
    var deficitTasks: [DeficitTask]
}
```

### Worker

```swift
struct Worker {
    var id: UUID
    var department: Department
}
```

### Task

```swift
struct Task {
    var id: UUID
    var department: Department
    var traveler: Traveler
    var issues: [ProductionIssue]?
}
```

### WorkerTask

```swift
struct WorkerTask {
    var id: UUID
    var worker: Worker
    var task: Task?
    var startDate: Date
    var endDate: Date
    var duration: TimeInterval {
        return endDate - startDate
    }
}
```

### DeficitTask

```swift
struct DeficitTask {
    var id: UUID
    var task: Task
    var deficitHours: Double
}
```

### Department

```swift
struct Department: Identifiable {
    var id: UUID
}
```

### Traveler

```swift
struct Traveler {
    var id: UUID
}
```

---

## Example cURL

```bash
curl -X POST "https://<host>/api/v1/production-plans:generate" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 7d2b3e30-3cb5-4f4c-9f45-4c3c51d1f7d1" \
  -d '{
    "startDate": "2026-02-02T07:00:00Z",
    "endDate": "2026-02-05T07:00:00Z",
    "numberOfShifts": 6
  }'
```

---

## Implementation checklist (server)

- [ ] Validate request payload (`startDate`, `endDate`, `numberOfShifts`)
- [ ] Fetch `TravelerStation` where `isCurrent=true`; collect `travelerId`s
- [ ] Fetch `Task` where `task.travelerId IN travelerIds`
- [ ] Fetch all `Shift` templates; compute occurrences within `[startDate, endDate)`
- [ ] Create new `ProductionPlan`
- [ ] Create `ProductionPlanShift[]` (empty) for selected shift occurrences
- [ ] Invoke scheduling algorithm with `[Task]`, `[ProductionPlanShift]`, `startDate`, `endDate`
- [ ] Persist `ProductionPlan`, shifts, worker tasks, deficit tasks in a transaction
- [ ] Return `201 Created` with saved plan graph
