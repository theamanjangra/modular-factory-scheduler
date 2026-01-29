
import { PlanAdjustmentService } from '../src/services/planAdjustmentService';
import { AdjustPlanSimpleRequest, Task, Worker, WorkerTask } from '../src/types';

const mockTasks: Task[] = [
    { taskId: 't1', name: 'Task 1', estimatedTotalLaborHours: 4, minWorkers: 1, maxWorkers: 2, requiredSkills: [] },
    { taskId: 't2', name: 'Task 2', estimatedTotalLaborHours: 4, minWorkers: 1, maxWorkers: 2, requiredSkills: [], prerequisiteTaskIds: ['t1'] }
];

const mockWorkers: Worker[] = [
    { workerId: 'w1', name: 'Worker 1', availability: { startTime: '2025-01-01T08:00:00Z', endTime: '2025-01-01T16:00:00Z' }, skills: [] }
];

const mockAssignments: WorkerTask[] = [
    { workerId: 'w1', taskId: 't1', startDate: '2025-01-01T08:00:00Z', endDate: '2025-01-01T12:00:00Z' },
    { workerId: 'w1', taskId: 't2', startDate: '2025-01-01T12:00:00Z', endDate: '2025-01-01T16:00:00Z' }
];

async function verify() {
    const service = new PlanAdjustmentService();
    const currentTime = '2025-01-01T10:00:00Z'; // 2 hours into Task 1

    console.log('--- Scenario 1: Delay Task 1 (Add 3 hours) ---');
    const delayReq: AdjustPlanSimpleRequest = {
        currentTime,
        updates: [
            { taskId: 't1', laborHoursRemaining: 5 } // 2 done, 5 remaining -> Total 7 (was 4)
        ]
    };
    const delayRes = await service.adjustPlanReplan(mockAssignments, mockTasks, mockWorkers, delayReq);
    console.log('Delay Diff:', JSON.stringify(delayRes, null, 2));

    console.log('--- Scenario 2: Finish Task 1 Early ---');
    const earlyReq: AdjustPlanSimpleRequest = {
        currentTime,
        updates: [
            { taskId: 't1', laborHoursRemaining: 0.5 } // 2 done, 0.5 remaining -> Total 2.5 (was 4)
        ]
    };
    const earlyRes = await service.adjustPlanReplan(mockAssignments, mockTasks, mockWorkers, earlyReq);
    console.log('Early Diff:', JSON.stringify(earlyRes, null, 2));

    console.log('--- Scenario 3: Add New Task (Mid-Plan) ---');
    const addReq: AdjustPlanSimpleRequest = {
        currentTime,
        updates: [],
        removedTaskIds: ['t2'], // Remove t2 to make space for t_new
        addedTasks: [
            {
                taskId: 't_new',
                name: 'New Task',
                estimatedTotalLaborHours: 4,
                minWorkers: 1,
                maxWorkers: 1,
                requiredSkills: []
            }
        ]
    };
    try {
        const addRes = await service.adjustPlanReplan(mockAssignments, mockTasks, mockWorkers, addReq);
        console.log('Add Task Result (Assignments count):', addRes.addedWorkerTasks.length);
        console.log('Added Tasks:', JSON.stringify(addRes.addedWorkerTasks, null, 2));
    } catch (e) {
        console.log('Add Task Error:', e);
    }

    console.log('--- Scenario 4: Worker Late (w1 available 11:00) ---');
    const lateReq: AdjustPlanSimpleRequest = {
        currentTime,
        updates: [],
        workerUpdates: [
            { workerId: 'w1', availability: { startTime: '2025-01-01T11:00:00Z', endTime: '2025-01-01T16:00:00Z' } }
        ]
    };
    const lateRes = await service.adjustPlanReplan(mockAssignments, mockTasks, mockWorkers, lateReq);
    console.log('Late Worker Impacted Tasks:', JSON.stringify(lateRes.impactedTasks, null, 2));
}

verify().catch(console.error);
