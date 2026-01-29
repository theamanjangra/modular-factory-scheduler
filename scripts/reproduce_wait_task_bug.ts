
import { PlanningService } from '../src/services/planningService';
import { PlanRequest, Task, Worker } from '../src/types';

const timeStr = (hours: number, minutes: number = 0) => {
    const d = new Date('2024-01-01T00:00:00Z');
    d.setUTCHours(hours, minutes, 0, 0);
    return d.toISOString();
};

async function runTest() {
    console.log('--- TEST CASE 2: Strict User Scenario ---');
    console.log('Scenario: Task A (9h) -> Wait (4h) -> Task C');
    console.log('Timeline: A (06:30-15:30) -> Wait (15:30-19:30) -> C (Should start 19:30)');

    const workers: Worker[] = [
        {
            workerId: 'w1',
            name: 'Worker 1',
            availability: { startTime: timeStr(6, 30), endTime: timeStr(21, 30) }
        }
    ];

    const tasks: Task[] = [
        {
            taskId: 'A',
            name: 'Task A',
            estimatedTotalLaborHours: 9, // Ends 15:30
            minWorkers: 1,
            maxWorkers: 1
        },
        {
            taskId: 'B',
            name: 'Wait B',
            taskType: 'nonWorker',
            nonWorkerTaskDuration: 4, // Ends 19:30
            prerequisiteTaskIds: ['A'],
            estimatedTotalLaborHours: 4
        },
        {
            taskId: 'C',
            name: 'Task C',
            estimatedTotalLaborHours: 2,
            minWorkers: 1,
            maxWorkers: 1,
            prerequisiteTaskIds: ['B']
        }
    ];

    const request: PlanRequest = {
        workers,
        tasks,
        interval: { startTime: timeStr(6, 30), endTime: timeStr(21, 30) },
        useHistorical: false
    };

    const service = new PlanningService();
    const result = service.plan(request);

    // Analyze Results
    const aAssigns = result.filter(r => r.taskId === 'A');
    const aEnd = aAssigns.reduce((max, r) => r.endDate > max ? r.endDate : max, '');

    const cAssigns = result.filter(r => r.taskId === 'C');
    const cStart = cAssigns.reduce((min, r) => (min === '' || r.startDate < min) ? r.startDate : min, '');

    console.log('\n--- RESULTS ---');
    console.log(`Task A End:   ${new Date(aEnd).toISOString().substr(11, 5)}`);
    console.log(`Task C Start: ${new Date(cStart).toISOString().substr(11, 5)}`);

    const expectedCStartStr = '19:30';
    const actualCStartStr = new Date(cStart).toISOString().substr(11, 5);

    if (actualCStartStr !== expectedCStartStr) {
        console.error(`❌ FAIL: Expected ${expectedCStartStr}, got ${actualCStartStr}`);
    } else {
        console.log(`✅ PASS: Matches expected ${expectedCStartStr}`);
    }
}

runTest();
