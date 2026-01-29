
import { PlanAdjustmentService } from '../src/services/planAdjustmentService';
import { WorkerTask, Task, Worker } from '../src/types';

const service = new PlanAdjustmentService();

// Mock Data
const tasks: Task[] = [
    { taskId: 't1', name: 'Task 1', estimatedTotalLaborHours: 8, requiredSkills: ['s1'] }
];

const workers: Worker[] = [
    { workerId: 'w1', name: 'Worker 1', skills: ['s1'], availability: { startTime: '2026-01-19T07:00:00Z', endTime: '2026-01-19T17:00:00Z' } }
];

// Original Plan: w1 works 07:00 - 15:00 (8h)
const assignments: WorkerTask[] = [
    {
        workerId: 'w1',
        taskId: 't1',
        startDate: '2026-01-19T07:00:00Z',
        endDate: '2026-01-19T15:00:00Z'
    }
];

// Update: w1 comes in late (10:00 - 18:00)
// Expected: A1 should shift to 10:00 - 18:00
const request = {
    planId: 'test',
    currentTime: '2026-01-19T07:00:00Z',
    updates: [],
    workerUpdates: [
        {
            workerId: 'w1',
            availability: {
                startTime: '2026-01-19T10:00:00Z',
                endTime: '2026-01-19T18:00:00Z'
            }
        }
    ]
};

async function run() {
    const result = await service.adjustPlanReplan(assignments, tasks, workers, request as any);

    console.log('--- Result ---');
    if (result.impactedTasks.length === 0 && result.updatedWorkerTasks.length === 0 && result.addedWorkerTasks.length === 0) {
        console.log('FAILURE: No impact detected.');
    } else {
        console.log('Updates:', JSON.stringify(result.updatedWorkerTasks, null, 2));
        console.log('Added:', JSON.stringify(result.addedWorkerTasks, null, 2));
        console.log('Removed:', JSON.stringify(result.removedWorkerTasks, null, 2));
    }
}

run();
