import { PlanningService } from '../src/services/planningService';
import { PlanRequest } from '../src/types';

describe('Planning Algorithm - Optimization Strategy', () => {
    const planner = new PlanningService();
    const startTime = "2025-01-01T08:00:00Z";
    const noonTime = "2025-01-01T12:00:00Z";
    const endTime = "2025-01-01T16:00:00Z";

    it('should assign early workers to Task A to free up regular workers for Task B', () => {
        const payload: PlanRequest = {
            interval: { startTime, endTime },
            useHistorical: false,
            workers: [
                // 2 "Regular" workers (Available all day)
                { workerId: "A1", skills: ["General"] },
                { workerId: "A2", skills: ["General"] },
                // 2 "Morning" workers (Available only 8-12)
                { workerId: "M1", skills: ["General"], availability: { startTime, endTime: noonTime } },
                { workerId: "M2", skills: ["General"], availability: { startTime, endTime: noonTime } }
            ],
            tasks: [
                {
                    taskId: "TaskA",
                    minWorkers: 2,
                    maxWorkers: 4, // Allow acceleration
                    estimatedTotalLaborHours: 16, // 2 workers * 8h normally. With 4 workers -> 4h.
                    estimatedRemainingLaborHours: 16,
                    requiredSkills: ["General"]
                },
                {
                    taskId: "TaskB",
                    minWorkers: 2,
                    maxWorkers: 2,
                    estimatedTotalLaborHours: 4,
                    estimatedRemainingLaborHours: 4,
                    requiredSkills: ["General"],
                    earliestStartDate: noonTime // Constraint: Can't start until noon
                }
            ]
        };

        const result = planner.plan(payload);

        // Analyze Result
        const taskA = result.filter(r => r.taskId === 'TaskA');
        const taskB = result.filter(r => r.taskId === 'TaskB');

        // Check if Task A finished
        // We expect Task A to use 4 workers from 8-12.
        // Total man-hours: 4 workers * 4 hours = 16. DONE at 12:00.
        // If it didn't use 4 workers, it wouldn't finish early, and then at 12:00, 
        // A1/A2 would still be busy on A, and B would fail or be delayed.

        // Task A Checks
        const taskA_endTimes = taskA.map(t => new Date(t.endDate).getTime());
        const maxEndA = Math.max(...taskA_endTimes);
        const noonVal = new Date(noonTime).getTime();

        expect(maxEndA).toBeLessThanOrEqual(noonVal);

        // Check Task B assignments
        // B should start at noon.
        const taskB_startTimes = taskB.map(t => new Date(t.startDate).getTime());
        const minStartB = Math.min(...taskB_startTimes);

        expect(minStartB).toBeGreaterThanOrEqual(noonVal);
        expect(taskB.length).toBeGreaterThan(0); // Should be assigned

        // Verify Users
        const taskB_workers = new Set(taskB.map(t => t.workerId));
        // Only A1 and A2 are available at noon
        expect(taskB_workers.has("A1")).toBe(true);
        expect(taskB_workers.has("A2")).toBe(true);
    });
});
