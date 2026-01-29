import { PlanAdjustmentService } from '../src/services/planAdjustmentService';
import { AdjustPlanSimpleRequest, Task, Worker, WorkerTask } from '../src/types';

describe('PlanAdjustmentService', () => {
    it('delays dependent tasks when a non-labor task sits between them', async () => {
        const service = new PlanAdjustmentService();

        const tasks: Task[] = [
            {
                taskId: 'A',
                name: 'Paint',
                estimatedTotalLaborHours: 2
            },
            {
                taskId: 'W',
                name: 'Dry',
                taskType: 'nonWorker',
                nonWorkerTaskDuration: 4,
                prerequisiteTaskIds: ['A']
            },
            {
                taskId: 'B',
                name: 'Second Coat',
                estimatedTotalLaborHours: 2,
                prerequisiteTaskIds: ['W']
            }
        ];

        const workers: Worker[] = [
            { workerId: 'w1', name: 'Worker 1' }
        ];

        const originalAssignments: WorkerTask[] = [
            {
                workerId: 'w1',
                taskId: 'A',
                startDate: '2024-01-01T08:00:00.000Z',
                endDate: '2024-01-01T10:00:00.000Z'
            },
            {
                workerId: 'w1',
                taskId: 'B',
                startDate: '2024-01-01T14:00:00.000Z',
                endDate: '2024-01-01T16:00:00.000Z'
            }
        ];

        const request: AdjustPlanSimpleRequest = {
            currentTime: '2024-01-01T07:00:00.000Z',
            updates: [
                {
                    taskId: 'A',
                    laborHoursRemaining: 3
                }
            ]
        };

        const result = await service.adjustPlanReplan(
            originalAssignments,
            tasks,
            workers,
            request
        );

        const removedB = result.removedWorkerTasks.find(task => task.taskId === 'B');
        const addedB = result.addedWorkerTasks.find(task => task.taskId === 'B');

        expect(removedB).toBeDefined();
        expect(addedB).toBeDefined();
        expect(new Date(removedB!.startDate).toISOString()).toBe('2024-01-01T14:00:00.000Z');
        expect(new Date(addedB!.startDate).toISOString()).toBe('2024-01-01T15:00:00.000Z');

        // Verify Wait Task 'W' is also shifted and visible
        const removedW = result.removedWorkerTasks.find(task => task.taskId === 'W');
        const addedW = result.addedWorkerTasks.find(task => task.taskId === 'W');

        // It should be removed (old time) and added (new time) because Start Time is part of the Key
        expect(removedW).toBeDefined();
        expect(addedW).toBeDefined();
        // Original Wait: Start 10:00 (End of A)
        expect(new Date(removedW!.startDate).toISOString()).toBe('2024-01-01T10:00:00.000Z');
        // New Wait: Start 11:00 (New End of A)
        expect(new Date(addedW!.startDate).toISOString()).toBe('2024-01-01T11:00:00.000Z');
    });

    it('shifts downstream tasks even when the updated task finished before currentTime', async () => {
        const service = new PlanAdjustmentService();

        const tasks: Task[] = [
            {
                taskId: 'A',
                name: 'Paint',
                estimatedTotalLaborHours: 2
            },
            {
                taskId: 'W',
                name: 'Dry',
                taskType: 'nonWorker',
                nonWorkerTaskDuration: 4,
                prerequisiteTaskIds: ['A']
            },
            {
                taskId: 'B',
                name: 'Second Coat',
                estimatedTotalLaborHours: 2,
                prerequisiteTaskIds: ['W']
            }
        ];

        const workers: Worker[] = [
            { workerId: 'w1', name: 'Worker 1' }
        ];

        const originalAssignments: WorkerTask[] = [
            {
                workerId: 'w1',
                taskId: 'A',
                startDate: '2024-01-01T08:00:00.000Z',
                endDate: '2024-01-01T10:00:00.000Z'
            },
            {
                workerId: 'w1',
                taskId: 'B',
                startDate: '2024-01-01T14:00:00.000Z',
                endDate: '2024-01-01T16:00:00.000Z'
            }
        ];

        const request: AdjustPlanSimpleRequest = {
            currentTime: '2024-01-01T12:00:00.000Z',
            updates: [
                {
                    taskId: 'A',
                    laborHoursRemaining: 3
                }
            ]
        };

        const result = await service.adjustPlanReplan(
            originalAssignments,
            tasks,
            workers,
            request
        );

        const updatedA = result.updatedWorkerTasks.find(task => task.taskId === 'A');
        const removedB = result.removedWorkerTasks.find(task => task.taskId === 'B');
        const addedB = result.addedWorkerTasks.find(task => task.taskId === 'B');
        const removedW = result.removedWorkerTasks.find(task => task.taskId === 'W');
        const addedW = result.addedWorkerTasks.find(task => task.taskId === 'W');

        expect(updatedA).toBeDefined();
        expect(new Date(updatedA!.endDate).toISOString()).toBe('2024-01-01T11:00:00.000Z');

        expect(removedB).toBeDefined();
        expect(addedB).toBeDefined();
        expect(new Date(addedB!.startDate).toISOString()).toBe('2024-01-01T15:00:00.000Z');

        expect(removedW).toBeDefined();
        expect(addedW).toBeDefined();
        expect(new Date(removedW!.startDate).toISOString()).toBe('2024-01-01T10:00:00.000Z');
        expect(new Date(addedW!.startDate).toISOString()).toBe('2024-01-01T11:00:00.000Z');
    });
});
