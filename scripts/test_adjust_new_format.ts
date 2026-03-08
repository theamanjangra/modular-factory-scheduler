/**
 * Tests the new request/response structure for POST /api/v1/plans/adjust
 */
import axios from 'axios';

const BASE = 'http://localhost:3000';

async function main() {
    console.log('=== Test 1: Basic adjustment with new format ===\n');

    const payload = {
        currentTime: '2024-01-01T12:00:00Z',

        // User's clean format
        taskUpdates: [
            { taskId: 'task-1', laborHoursRemaining: 2.0 }
        ],
        workerUpdates: [
            { workerId: 'w2', startDate: '2024-01-01T13:00:00Z', endDate: null }
        ],

        // Ephemeral context
        tasks: [
            { taskId: 'task-1', name: 'Framing', estimatedTotalLaborHours: 10, maxWorkers: 2, minWorkers: 1 },
            { taskId: 'task-2', name: 'Drywall', estimatedTotalLaborHours: 8, maxWorkers: 2, minWorkers: 1, prerequisiteTaskIds: ['task-1'] }
        ],
        workers: [
            { workerId: 'w1', name: 'Alice', availability: { startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T18:00:00Z' } },
            { workerId: 'w2', name: 'Bob', availability: { startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T18:00:00Z' } }
        ],
        originalAssignments: [
            { id: 'aaa-111', workerId: 'w1', taskId: 'task-1', startDate: '2024-01-01T08:00:00Z', endDate: '2024-01-01T13:00:00Z' },
            { id: 'bbb-222', workerId: 'w2', taskId: 'task-1', startDate: '2024-01-01T08:00:00Z', endDate: '2024-01-01T13:00:00Z' },
            { id: 'ccc-333', workerId: 'w1', taskId: 'task-2', startDate: '2024-01-01T13:00:00Z', endDate: '2024-01-01T17:00:00Z' },
            { id: 'ddd-444', workerId: 'w2', taskId: 'task-2', startDate: '2024-01-01T13:00:00Z', endDate: '2024-01-01T17:00:00Z' }
        ]
    };

    try {
        const res = await axios.post(`${BASE}/api/v1/plans/adjust`, payload, { timeout: 30000 });
        console.log('✅ STATUS:', res.status);

        const d = res.data;
        console.log('\n📦 Response shape:');
        console.log('  workerTasks.added:', d.workerTasks?.added?.length);
        console.log('  workerTasks.updated:', d.workerTasks?.updated?.length);
        console.log('  workerTasks.deleted:', d.workerTasks?.deleted?.length);
        console.log('  deficitTasks.added:', d.deficitTasks?.added?.length);
        console.log('  deficitTasks.updated:', d.deficitTasks?.updated?.length);
        console.log('  deficitTasks.deleted:', d.deficitTasks?.deleted?.length);

        // Verify structure
        console.log('\n🔍 Structure validation:');
        if (d.workerTasks?.added?.[0]) {
            const a = d.workerTasks.added[0];
            console.log('  added[0] has id:', typeof a.id === 'string' ? '✅' : '❌');
            console.log('  added[0] has workerId:', typeof a.workerId === 'string' ? '✅' : '❌');
            console.log('  added[0] has taskId:', a.taskId !== undefined ? '✅' : '❌');
            console.log('  added[0] has startDate:', typeof a.startDate === 'string' ? '✅' : '❌');
            console.log('  added[0] has endDate:', typeof a.endDate === 'string' ? '✅' : '❌');
        }
        if (d.workerTasks?.deleted?.[0]) {
            console.log('  deleted[0] is string ID:', typeof d.workerTasks.deleted[0] === 'string' ? '✅' : '❌');
        }
        if (d.deficitTasks?.added?.[0]) {
            const dt = d.deficitTasks.added[0];
            console.log('  deficit.added[0] has id:', typeof dt.id === 'string' ? '✅' : '❌');
            console.log('  deficit.added[0] has task.id:', typeof dt.task?.id === 'string' ? '✅' : '❌');
            console.log('  deficit.added[0] has task.name:', dt.task?.name !== undefined ? '✅' : '❌');
            console.log('  deficit.added[0] has deficitHours:', typeof dt.deficitHours === 'number' ? '✅' : '❌');
        }

        console.log('\n📄 Full response:');
        console.log(JSON.stringify(d, null, 2));
    } catch (e: any) {
        console.log('❌ ERROR:', e.response?.status, e.response?.data || e.message);
    }

    console.log('\n=== Test 2: With previousDeficitTasks (delta tracking) ===\n');

    const payload2 = {
        ...payload,
        previousDeficitTasks: [
            { id: 'prev-deficit-1', taskId: 'task-2', deficitHours: 10.0 }
        ]
    };

    try {
        const res = await axios.post(`${BASE}/api/v1/plans/adjust`, payload2, { timeout: 30000 });
        console.log('✅ STATUS:', res.status);
        const d = res.data;
        console.log('  deficit.added:', d.deficitTasks?.added?.length);
        console.log('  deficit.updated:', d.deficitTasks?.updated?.length);
        console.log('  deficit.deleted:', d.deficitTasks?.deleted?.length);
        if (d.deficitTasks?.updated?.[0]) {
            console.log('  Updated deficit preserves ID:', d.deficitTasks.updated[0].id === 'prev-deficit-1' ? '✅' : '❌');
        }
    } catch (e: any) {
        console.log('❌ ERROR:', e.response?.status, e.response?.data || e.message);
    }

    console.log('\n=== Test 3: Validation error ===\n');

    try {
        await axios.post(`${BASE}/api/v1/plans/adjust`, { currentTime: '2024-01-01T12:00:00Z' }, { timeout: 10000 });
        console.log('❌ Should have failed!');
    } catch (e: any) {
        console.log('✅ Correctly rejected:', e.response?.status, e.response?.data);
    }

    console.log('\n=== All tests complete ===');
}

main().catch(console.error);
