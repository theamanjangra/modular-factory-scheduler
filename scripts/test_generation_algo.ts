
import { PlanningService } from '../src/services/planningService';
import { Worker, Task, Interval } from '../src/types';
import { aggregateSchedule } from '../src/utils/scheduleAggregator';

/**
 * THE GAUNTLET: Test Harness for Optimization Strategy
 * Scenario:
 * - 3 Workers Total. (w1, w2, w3)
 * - Interval: 08:00 - 17:00 (9h).
 * 
 * - Task X (Prereq for B): 4h duration. Min 1. Max 1.
 *   -> Runs 08:00 - 12:00 (Block 0-8). Takes 1 Worker.
 * 
 * - Task A: 8h labor. Min 1. Max 2.
 *   -> Independent.
 *   -> Can run from 08:00.
 * 
 * - Task B: 12h labor. Min 3. Max 3.
 *   -> Prereq: X.
 *   -> Earliest Start: 12:00.
 *   -> Duration: 4h (since 3 workers * 4h = 12 labor-hours).
 *   -> Needs ALL 3 workers to run.
 * 
 * FAILURE CONDITION (Naive Greedy):
 * - 08:00: X takes w1. A (Min 1) takes w2. w3 is IDLE.
 * - 12:00: X done. A (4h labor done, 4h left) takes w2. w1, w3 free.
 * - Pool: 2 workers.
 * - B needs 3 workers. B CANNOT START.
 * - Result: B delayed or failed.
 * 
 * SUCCESS CONDITION (Front-Loading):
 * - 08:00: X takes w1. A takes w2 AND w3 (Max 2).
 * - 12:00: X done. A (8h labor done) FINISHED.
 * - Pool: w1, w2, w3 (All 3 free).
 * - B starts immediately with 3 workers.
 */

async function runGauntlet() {
    console.log("⚔️ Running The Gauntlet: Scheduler Optimization Test ⚔️");

    const workers: Worker[] = [
        { workerId: 'w1', name: 'W1', skills: ['general'] },
        { workerId: 'w2', name: 'W2', skills: ['general'] },
        { workerId: 'w3', name: 'W3', skills: ['general'] }
    ];

    const tasks: Task[] = [
        // Task X: The Prerequisite (Locks 1 worker till noon)
        {
            taskId: 'X',
            name: 'Prequisite X',
            estimatedRemainingLaborHours: 4,
            estimatedTotalLaborHours: 4,
            requiredSkills: ['general'],
            minWorkers: 1,
            maxWorkers: 1
        },
        // Task A: The Resource Hog (Needs clearing)
        {
            taskId: 'A',
            name: 'Distraction A',
            estimatedRemainingLaborHours: 8,
            estimatedTotalLaborHours: 8,
            requiredSkills: ['general'],
            minWorkers: 1,
            maxWorkers: 2 // Allows Front-Loading
        },
        // Task B: The Bottleneck (Needs everyone)
        {
            taskId: 'B',
            name: 'Critical B',
            estimatedRemainingLaborHours: 12,
            estimatedTotalLaborHours: 12,
            requiredSkills: ['general'],
            minWorkers: 3,
            maxWorkers: 3,
            prerequisiteTaskIds: ['X']
        }
    ];

    const interval: Interval = {
        startTime: "2024-01-01T08:00:00Z",
        endTime: "2024-01-01T17:00:00Z"
    };

    // Instantiate Solver
    const planner = new PlanningService();
    // Note: We might need to enable a 'smartMode' flag or similar in the future, 
    // but the goal is for the default 'plan' to be smart.
    const rawSteps = planner.plan({
        workers,
        tasks,
        interval,
        useHistorical: false
    });

    const result = aggregateSchedule(rawSteps);

    // ANALYSIS
    // Find Task B assignments
    const bAssignments = result.assignments.filter(a => a.taskId === 'B');
    if (bAssignments.length === 0) {
        console.error("❌ FAILURE: Task B was never assigned!");
        process.exit(1);
    }

    const bStart = bAssignments[0].startDate;
    const bStartHour = new Date(bStart).getUTCHours();

    console.log(`Task B started at hour: ${bStartHour}`);

    if (bStartHour <= 12) {
        console.log("✅ SUCCESS: Task B started by 12:00. Front-loading worked!");
        process.exit(0);
    } else {
        console.error(`❌ FAILURE: Task B started late (${bStartHour}:00). Optimization failed.`);
        process.exit(1);
    }
}

runGauntlet();
