/**
 * Extended test — verifies diff output with proper availability windows
 */
import axios from 'axios';

const BASE = 'http://localhost:3000';

async function main() {
    console.log('=== Test 1: Task labor reduced (should shorten schedule) ===\n');

    const payload1 = {
        currentTime: '2024-01-01T10:00:00Z',
        updates: [
            { taskId: 'task-1', laborHoursRemaining: 6, interpretAs: 'total' as const }
        ],
        tasks: [
            {
                taskId: 'task-1',
                name: 'Framing',
                estimatedTotalLaborHours: 10,
                maxWorkers: 2,
                minWorkers: 1
            },
            {
                taskId: 'task-2',
                name: 'Drywall',
                estimatedTotalLaborHours: 8,
                maxWorkers: 2,
                minWorkers: 1,
                prerequisiteTaskIds: ['task-1']
            }
        ],
        workers: [
            { workerId: 'w1', name: 'Alice', availability: { startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T18:00:00Z' } },
            { workerId: 'w2', name: 'Bob', availability: { startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T18:00:00Z' } }
        ],
        originalAssignments: [
            { workerId: 'w1', taskId: 'task-1', startDate: '2024-01-01T08:00:00Z', endDate: '2024-01-01T13:00:00Z' },
            { workerId: 'w2', taskId: 'task-1', startDate: '2024-01-01T08:00:00Z', endDate: '2024-01-01T13:00:00Z' },
            { workerId: 'w1', taskId: 'task-2', startDate: '2024-01-01T13:00:00Z', endDate: '2024-01-01T17:00:00Z' },
            { workerId: 'w2', taskId: 'task-2', startDate: '2024-01-01T13:00:00Z', endDate: '2024-01-01T17:00:00Z' }
        ]
    };

    try {
        const r1 = await axios.post(`${BASE}/api/v1/plans/ephemeral/adjust`, payload1, { timeout: 30000 });
        console.log('✅ STATUS:', r1.status);
        console.log('  added:', r1.data.addedWorkerTasks?.length);
        console.log('  removed:', r1.data.removedWorkerTasks?.length);
        console.log('  updated:', r1.data.updatedWorkerTasks?.length);
        console.log('  impacted:', r1.data.impactedTasks?.length);
        console.log('  deficit:', r1.data.deficitTasks?.length);
        console.log('  idle:', r1.data.idleWorkers?.length);
        if (r1.data.impactedTasks?.length) {
            console.log('\n  Impacted tasks:', JSON.stringify(r1.data.impactedTasks, null, 4));
        }
        if (r1.data.addedWorkerTasks?.length) {
            console.log('  Added:', JSON.stringify(r1.data.addedWorkerTasks, null, 4));
        }
        if (r1.data.updatedWorkerTasks?.length) {
            console.log('  Updated:', JSON.stringify(r1.data.updatedWorkerTasks, null, 4));
        }
        if (r1.data.removedWorkerTasks?.length) {
            console.log('  Removed:', JSON.stringify(r1.data.removedWorkerTasks, null, 4));
        }
    } catch (e: any) {
        console.log('❌ ERROR:', e.response?.status, e.response?.data || e.message);
    }

    console.log('\n=== Test 2: Worker late arrival ===\n');

    const payload2 = {
        currentTime: '2024-01-01T10:00:00Z',
        updates: [],
        workerUpdates: [
            { workerId: 'w2', availability: { startTime: '2024-01-01T11:00:00Z', endTime: '2024-01-01T18:00:00Z' } }
        ],
        tasks: payload1.tasks,
        workers: payload1.workers,
        originalAssignments: payload1.originalAssignments
    };

    try {
        const r2 = await axios.post(`${BASE}/api/v1/plans/ephemeral/adjust`, payload2, { timeout: 30000 });
        console.log('✅ STATUS:', r2.status);
        console.log('  added:', r2.data.addedWorkerTasks?.length);
        console.log('  removed:', r2.data.removedWorkerTasks?.length);
        console.log('  updated:', r2.data.updatedWorkerTasks?.length);
        console.log('  impacted:', r2.data.impactedTasks?.length);
        console.log('  deficit:', r2.data.deficitTasks?.length);
    } catch (e: any) {
        console.log('❌ ERROR:', e.response?.status, e.response?.data || e.message);
    }

    console.log('\n=== Test 3: Validation — missing currentTime ===\n');

    try {
        await axios.post(`${BASE}/api/v1/plans/ephemeral/adjust`, { updates: [] }, { timeout: 10000 });
        console.log('❌ Should have failed!');
    } catch (e: any) {
        console.log('✅ Correctly rejected:', e.response?.status, e.response?.data);
    }

    console.log('\n=== Test 4: Persistent mode rejection ===\n');

    try {
        await axios.post(`${BASE}/api/v1/plans/some-uuid/adjust`, {
            currentTime: '2024-01-01T10:00:00Z',
            updates: []
        }, { timeout: 10000 });
        console.log('❌ Should have failed!');
    } catch (e: any) {
        console.log('✅ Correctly rejected:', e.response?.status, e.response?.data);
    }

    console.log('\n=== All tests complete ===');
}

main().catch(console.error);
