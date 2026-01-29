# Replan API Test Suite

Comprehensive test suite for the `/api/v1/plans/:planId/adjust` endpoint.

## Overview

This test suite contains **115+ test cases** covering:

- **Labor task updates**: Increase/decrease hours
- **interpretAs modes**: `total` vs `remaining`
- **Non-labor (wait) tasks**: Cascading through wait tasks
- **Post-completion updates**: Updates after task already ended
- **Multiple updates**: Batch updates in single request
- **Worker updates**: Late arrival, early departure
- **Constraints**: earliestStartDate, prerequisites, minWorkers/maxWorkers
- **Error cases**: Invalid inputs returning 400
- **Complex scenarios**: Combined worker + task updates, parallel tasks
- **Ground truth cases**: Small cases for exhaustive verification

## Directory Structure

```
tests/replan/
    cases/           # Input JSON files (TC001.json, TC002.json, ...)
    expected/        # Expected output files (for ground truth verification)
    postman/         # Postman collection and environment
    reports/         # Test run reports (generated)
    README.md        # This file
    test-index.json  # Index of all test cases
```

## Quick Start

### 1. Generate Test Cases

```bash
npx ts-node scripts/generate_replan_tests.ts
```

This generates:
- 115+ test case files in `tests/replan/cases/`
- Postman collection in `tests/replan/postman/`
- Test index in `tests/replan/test-index.json`

### 2. Start the API Server

```bash
npm run dev
# or
npm start
```

Server should be running on `http://localhost:8080`

### 3. Run Tests with TypeScript Runner

```bash
npx ts-node scripts/run_replan_tests.ts
```

Optional: Specify a different API URL:
```bash
API_URL=http://localhost:3000 npx ts-node scripts/run_replan_tests.ts
```

### 4. Run Tests with Newman (Postman CLI)

```bash
# Install Newman globally if not already
npm install -g newman

# Run the collection
newman run tests/replan/postman/replan-api-tests.postman_collection.json \
    -e tests/replan/postman/environment.json \
    --reporters cli,json \
    --reporter-json-export tests/replan/reports/newman-report.json
```

## Test Categories

| Category | Test IDs | Description |
|----------|----------|-------------|
| `labor_increase` | TC001-TC010 | Increase task labor hours |
| `labor_decrease` | TC011-TC020 | Decrease task labor hours |
| `interpret_as` | TC021-TC030 | `total` vs `remaining` interpretation |
| `non_labor` | TC031-TC040 | Wait tasks and cascading |
| `after_task_end` | TC041-TC050 | Updates after task completion |
| `multiple_updates` | TC051-TC060 | Batch updates |
| `worker_late` | TC061-TC070 | Worker late arrival |
| `worker_early_leave` | TC071-TC080 | Worker reduced availability |
| `earliest_start` | TC081-TC085 | earliestStartDate constraints |
| `prerequisites` | TC086-TC090 | Prerequisite chain cascading |
| `worker_constraints` | TC091-TC095 | minWorkers/maxWorkers edges |
| `invalid_input` | TC096-TC105 | 400 error cases |
| `complex` | TC106-TC108 | Combined scenarios |
| `edge_case` | TC109-TC112 | Edge cases |
| `ground_truth` | TC113-TC115 | Small cases for optimality check |

## Invariants Checked

The test runner validates these invariants for 200 responses:

| Invariant | Description |
|-----------|-------------|
| `no_overlaps` | No worker has overlapping assignments |
| `valid_times` | All start/end dates are valid, end >= start |
| `diff_minimal` | No duplicate keys in diff, changes are minimal |
| `prereqs_respected` | Tasks don't start before prerequisites end |
| `worker_availability_respected` | Workers only assigned during available times |
| `cascade_correct` | Dependent tasks shift when parent extends |
| `earliest_start_respected` | earliestStartDate constraints honored |
| `deficit_reported` | Deficit tasks reported when workers insufficient |

## Adding New Test Cases

1. Create a new JSON file in `tests/replan/cases/`:

```json
{
    "id": "TC200",
    "name": "My new test case",
    "description": "Testing specific scenario",
    "category": "custom",
    "input": {
        "currentTime": "2026-01-22T07:00:00.000Z",
        "updates": [
            { "taskId": "t_1", "laborHoursRemaining": 5 }
        ],
        "tasks": [...],
        "workers": [...],
        "originalAssignments": [...]
    },
    "expectedStatus": 200,
    "invariants": ["no_overlaps", "valid_times", "prereqs_respected"]
}
```

2. (Optional) Create expected output in `tests/replan/expected/TC200.json`

3. Run the test:
```bash
npx ts-node scripts/run_replan_tests.ts
```

## API Schema Reference

### Request: `AdjustPlanSimpleRequest`

```typescript
interface AdjustPlanSimpleRequest {
    currentTime: string;                    // ISO 8601 - Required
    updates: TaskLaborUpdate[];             // Required (can be empty)
    workerUpdates?: WorkerAvailabilityUpdate[];
    preferences?: AdjustPlanPreferences;
    tasks?: Task[];                         // Required for ephemeral
    workers?: Worker[];                     // Required for ephemeral
    originalAssignments?: WorkerTask[];     // Required for ephemeral
    addedTasks?: Task[];
    removedTaskIds?: string[];
}

interface TaskLaborUpdate {
    taskId: string;
    laborHoursRemaining: number;
    interpretAs?: 'total' | 'remaining';    // Default: 'total'
}

interface WorkerAvailabilityUpdate {
    workerId: string;
    availability: {
        startTime: string;
        endTime: string;
    };
}
```

### Response: `AdjustPlanDiffResponse`

```typescript
interface AdjustPlanDiffResponse {
    version: string;
    addedWorkerTasks: AddedWorkerTask[];
    removedWorkerTasks: RemovedWorkerTask[];
    updatedWorkerTasks: UpdatedWorkerTask[];
    impactedTasks: ImpactedTask[];
    deficitTasks?: DeficitTask[];
    idleWorkers?: { workerId: string; availableFrom: string }[];
}
```

## Troubleshooting

### "Test cases directory not found"
Run `npx ts-node scripts/generate_replan_tests.ts` to generate test cases.

### "Connection refused"
Ensure the API server is running on the expected port (default: 8080).

### Tests timing out
Increase axios timeout in `run_replan_tests.ts` or check server performance.

## CI Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Generate test cases
  run: npx ts-node scripts/generate_replan_tests.ts

- name: Start server
  run: npm start &

- name: Wait for server
  run: sleep 5

- name: Run tests
  run: npx ts-node scripts/run_replan_tests.ts
```

## Reports

Test reports are saved to `tests/replan/reports/` with timestamps.

Each report contains:
- Summary (total, passed, failed, pass rate)
- Results by category
- Individual test results with invariant check details
