/**
 * Quick test for the adjustPlan ephemeral endpoint
 */
import axios from 'axios';

const BASE = 'http://localhost:3000';

async function main() {
    console.log('=== Testing POST /api/v1/plans/ephemeral/adjust ===\n');

    const payload = {
        currentTime: '2024-01-01T12:00:00Z',
        updates: [
            { taskId: 'task-1', laborHoursRemaining: 5, interpretAs: 'total' as const }
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
            { workerId: 'w1', name: 'Alice', startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T18:00:00Z' },
            { workerId: 'w2', name: 'Bob', startTime: '2024-01-01T08:00:00Z', endTime: '2024-01-01T18:00:00Z' }
        ],
        originalAssignments: [
            { workerId: 'w1', taskId: 'task-1', startDate: '2024-01-01T08:00:00Z', endDate: '2024-01-01T12:00:00Z' },
            { workerId: 'w2', taskId: 'task-1', startDate: '2024-01-01T08:00:00Z', endDate: '2024-01-01T12:00:00Z' },
            { workerId: 'w1', taskId: 'task-2', startDate: '2024-01-01T12:00:00Z', endDate: '2024-01-01T16:00:00Z' },
            { workerId: 'w2', taskId: 'task-2', startDate: '2024-01-01T12:00:00Z', endDate: '2024-01-01T16:00:00Z' }
        ]
    };

    try {
        const res = await axios.post(`${BASE}/api/v1/plans/ephemeral/adjust`, payload, { timeout: 30000 });
        console.log('✅ STATUS:', res.status);
        console.log('\nResponse structure:');
        const data = res.data;
        console.log('  version:', data.version);
        console.log('  addedWorkerTasks:', data.addedWorkerTasks?.length ?? 'N/A');
        console.log('  removedWorkerTasks:', data.removedWorkerTasks?.length ?? 'N/A');
        console.log('  updatedWorkerTasks:', data.updatedWorkerTasks?.length ?? 'N/A');
        console.log('  impactedTasks:', data.impactedTasks?.length ?? 'N/A');
        console.log('  deficitTasks:', data.deficitTasks?.length ?? 'N/A');
        console.log('  idleWorkers:', data.idleWorkers?.length ?? 'N/A');

        console.log('\nFull response:');
        console.log(JSON.stringify(data, null, 2));
    } catch (e: any) {
        console.log('❌ ERROR:', e.response?.status, e.response?.data || e.message);
    }
}

main().catch(console.error);
