# KAN-383: Inter-Department Task Matching Endpoint
## Implementation Plan

**JIRA:** KAN-383
**Status:** Planning
**Priority:** High (Production Endpoint)
**Caller:** iOS App (not web app)

---

## 1. Understanding the Ask

### Input
```typescript
{
  tasks: Task[],      // Tasks with required skills
  workers: Worker[]   // Workers with skill rankings
}
```

### Output
```typescript
{
  assignments: WorkerTask[],    // Successful worker-task matches
  idleWorkers: WorkerTask[],    // Workers with no task (null taskId)
  deficitTasks: DeficitTask[]   // Tasks that couldn't be staffed
}
```

### Core Matching Rule
> **"Only workers with ALL of the required skills qualify."**

This is a **hard constraint** - unlike the planning algorithm which uses soft preferences, this endpoint requires exact skill matching.

---

## 2. Difference from Existing Algorithm

| Aspect | Planning Algorithm (Current) | Matching Endpoint (KAN-383) |
|--------|------------------------------|----------------------------|
| **Purpose** | Schedule workers over time | One-time skill-based assignment |
| **Time** | Time-blocked (30-min intervals) | No time dimension |
| **Skills** | Soft preference (+100 bonus) | **Hard requirement** (must have ALL) |
| **Output** | Timeline of assignments | Single assignment per worker |
| **Ranking** | Used for scoring | Used for **priority ordering** |

---

## 3. Algorithm Design

### Step 1: Build Eligibility Matrix
For each task, find all workers who have **every** required skill.

```
Task "Framing" requires: [A, K]
Worker 1 has: [A, B, K] → ✅ Eligible
Worker 2 has: [A, C]    → ❌ Missing K
Worker 3 has: [A, K, L] → ✅ Eligible
```

### Step 2: Score Eligible Workers by Skill Ranking
Workers with **lower** ranking numbers are more proficient.

```typescript
// Worker skill score = sum of rankings for required skills
// Lower = better

Worker 1: A=1, K=3 → Score: 4
Worker 3: A=2, K=1 → Score: 3 ← Better match
```

### Step 3: Greedy Assignment
1. Sort tasks by: priority, labor hours, number of eligible workers (ascending)
2. For each task:
   - Get eligible, unassigned workers
   - Sort by skill score (ascending = better)
   - Assign up to `maxWorkers` (or `minWorkers` at minimum)
   - If can't meet `minWorkers`, mark as **Deficit Task**

### Step 4: Collect Results
- **assignments**: Workers successfully assigned to tasks
- **idleWorkers**: Workers not assigned to any task
- **deficitTasks**: Tasks that couldn't get enough qualified workers

---

## 4. Type Definitions

### New/Extended Types (src/types/index.ts)

```typescript
// Request for inter-department matching
export interface MatchingRequest {
  tasks: MatchableTask[];
  workers: MatchableWorker[];
}

// Task with required skills (extends existing CharacteristicTask or new)
export interface MatchableTask {
  taskId: string;
  name?: string;
  requiredSkills: string[];  // Skill codes required
  minWorkers?: number;       // Default: 1
  maxWorkers?: number;       // Default: 1
  priority?: number;         // Lower = higher priority
  estimatedLaborHours?: number;
}

// Worker with skill rankings
export interface MatchableWorker {
  workerId: string;
  name?: string;
  skills: Record<string, number>;  // skillCode -> ranking (1=best)
  departmentId?: string;
}

// Response types (reuse existing where possible)
export interface MatchingResponse {
  assignments: WorkerTask[];
  idleWorkers: WorkerTask[];
  deficitTasks: DeficitTask[];
}
```

---

## 5. File Structure

```
src/
├── services/
│   └── skillMatchingService.ts    ← NEW: Core matching logic
├── controllers/
│   └── workerTaskController.ts    ← ADD: matchBySkills() method
├── routes/
│   └── workerTasks.ts             ← ADD: /match endpoint
└── types/
    └── index.ts                   ← ADD: Matching types
```

---

## 6. Implementation Steps

### Phase 1: Types & Service (Core Logic)
| Step | Task | File | Est. Time |
|------|------|------|-----------|
| 1.1 | Add `MatchingRequest`, `MatchableTask`, `MatchableWorker` types | types/index.ts | 15 min |
| 1.2 | Create `SkillMatchingService` class | services/skillMatchingService.ts | 1 hr |
| 1.3 | Implement `hasAllRequiredSkills()` helper | skillMatchingService.ts | 15 min |
| 1.4 | Implement `calculateSkillScore()` helper | skillMatchingService.ts | 15 min |
| 1.5 | Implement `match()` main algorithm | skillMatchingService.ts | 45 min |

### Phase 2: API Endpoint
| Step | Task | File | Est. Time |
|------|------|------|-----------|
| 2.1 | Add `matchBySkills()` controller method | workerTaskController.ts | 30 min |
| 2.2 | Add `/match` POST route | workerTasks.ts | 10 min |
| 2.3 | Add request validation (optional) | workerTaskController.ts | 20 min |

### Phase 3: Testing
| Step | Task | Est. Time |
|------|------|-----------|
| 3.1 | Unit tests for `SkillMatchingService` | 45 min |
| 3.2 | Integration test for endpoint | 30 min |
| 3.3 | Manual testing with sample data | 20 min |

**Total Estimated Time: ~4-5 hours**

---

## 7. Service Code Skeleton

```typescript
// src/services/skillMatchingService.ts

import {
  MatchingRequest,
  MatchingResponse,
  MatchableTask,
  MatchableWorker,
  WorkerTask,
  DeficitTask
} from '../types';

export class SkillMatchingService {

  /**
   * Main matching function
   */
  public match(request: MatchingRequest): MatchingResponse {
    const { tasks, workers } = request;

    const assignments: WorkerTask[] = [];
    const deficitTasks: DeficitTask[] = [];
    const assignedWorkerIds = new Set<string>();

    // Sort tasks by priority (lower = higher priority)
    const sortedTasks = [...tasks].sort((a, b) =>
      (a.priority ?? 999) - (b.priority ?? 999)
    );

    for (const task of sortedTasks) {
      // Find eligible workers (have ALL required skills, not yet assigned)
      const eligible = workers
        .filter(w => !assignedWorkerIds.has(w.workerId))
        .filter(w => this.hasAllRequiredSkills(w, task.requiredSkills))
        .sort((a, b) =>
          this.calculateSkillScore(a, task.requiredSkills) -
          this.calculateSkillScore(b, task.requiredSkills)
        );

      const minNeeded = task.minWorkers ?? 1;
      const maxAllowed = task.maxWorkers ?? 1;

      if (eligible.length < minNeeded) {
        // Deficit: Can't meet minimum worker requirement
        deficitTasks.push({
          taskId: task.taskId,
          deficitHours: task.estimatedLaborHours ?? 0,
          requiredSkills: task.requiredSkills
        });
        continue;
      }

      // Assign workers up to maxWorkers
      const toAssign = eligible.slice(0, maxAllowed);
      for (const worker of toAssign) {
        assignedWorkerIds.add(worker.workerId);
        assignments.push({
          workerId: worker.workerId,
          taskId: task.taskId,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString()  // No time dimension
        });
      }
    }

    // Collect idle workers
    const idleWorkers: WorkerTask[] = workers
      .filter(w => !assignedWorkerIds.has(w.workerId))
      .map(w => ({
        workerId: w.workerId,
        taskId: null,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      }));

    return { assignments, idleWorkers, deficitTasks };
  }

  /**
   * Check if worker has ALL required skills
   */
  private hasAllRequiredSkills(
    worker: MatchableWorker,
    requiredSkills: string[]
  ): boolean {
    return requiredSkills.every(skill =>
      worker.skills[skill] !== undefined
    );
  }

  /**
   * Calculate skill score (lower = better)
   * Sum of rankings for required skills
   */
  private calculateSkillScore(
    worker: MatchableWorker,
    requiredSkills: string[]
  ): number {
    return requiredSkills.reduce((sum, skill) =>
      sum + (worker.skills[skill] ?? 999),
      0
    );
  }
}
```

---

## 8. API Endpoint Design

### Endpoint
```
POST /api/v1/worker-tasks/match
```

### Request Body
```json
{
  "tasks": [
    {
      "taskId": "task_1",
      "name": "Interior Framing",
      "requiredSkills": ["A", "K"],
      "minWorkers": 2,
      "maxWorkers": 4,
      "priority": 1
    }
  ],
  "workers": [
    {
      "workerId": "w_1",
      "name": "John Martinez",
      "skills": {
        "A": 1,
        "B": 3,
        "K": 2
      }
    }
  ]
}
```

### Response Body
```json
{
  "assignments": [
    {
      "workerId": "w_1",
      "taskId": "task_1",
      "startDate": "2026-01-13T00:00:00Z",
      "endDate": "2026-01-13T00:00:00Z"
    }
  ],
  "idleWorkers": [
    {
      "workerId": "w_5",
      "taskId": null,
      "startDate": "2026-01-13T00:00:00Z",
      "endDate": "2026-01-13T00:00:00Z"
    }
  ],
  "deficitTasks": [
    {
      "taskId": "task_3",
      "deficitHours": 12,
      "requiredSkills": ["V", "D"]
    }
  ]
}
```

---

## 9. Edge Cases to Handle

| Edge Case | Handling |
|-----------|----------|
| Task with no required skills | Matches all workers |
| Worker with no skills | Never matches (unless task has no requirements) |
| Task with `minWorkers > maxWorkers` | Use maxWorkers as limit, log warning |
| Duplicate worker IDs | Deduplicate on input |
| Empty tasks array | Return all workers as idle |
| Empty workers array | Return all tasks as deficit |

---

## 10. Questions for Josh

1. **Skill format**: Are skills always single letters (A-M) or can they be strings like "FRAMING"?
2. **Time fields**: Should `startDate`/`endDate` be populated with actual times, or are they placeholders?
3. **Priority logic**: Is lower priority number = higher priority? Or vice versa?
4. **Department filtering**: Should workers only match tasks in their department?
5. **Partial assignment**: If a task needs 4 workers but only 2 qualify, assign 2 or mark as deficit?

---

## 11. Verification Checklist

- [ ] Types added and exported
- [ ] Service implements correct matching logic
- [ ] Controller validates input
- [ ] Route registered
- [ ] Unit tests pass
- [ ] Integration test pass
- [ ] Manual test with sample data
- [ ] Build succeeds
- [ ] Ready for iOS integration

---

*Plan created: January 13, 2026*
*Ready to implement upon approval*
