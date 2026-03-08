/**
 * Tests the FINAL adjustPlan endpoint with minimal request.
 * Server fetches tasks/workers/assignments from production DB.
 * Only taskUpdates + workerUpdates in the request body.
 */
import axios from 'axios';

const BASE = 'http://localhost:3000';

async function main() {
    console.log('=== Test 1: Minimal request — server fetches from DB ===\n');

    // First, let's see what tasks exist by checking the master data endpoint
    try {
        console.log('Checking if server is up...');
        const health = await axios.get(`${BASE}/api/v1/worker-tasks/health`, { timeout: 5000 }).catch(() => null);
        console.log('Server status:', health?.status || 'could not reach');
    } catch (e) {
        // ignore
    }

    console.log('\nSending minimal adjust request...\n');

    const payload = {
        taskUpdates: [
            {
                taskId: "any-task-id",       // Will likely not match, but tests the flow
                laborHoursRemaining: 4.5
            }
        ],
        workerUpdates: [
            {
                workerId: "any-worker-id",   // Will likely not match
                startDate: null,
                endDate: null
            }
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

        // Show sample data
        if (d.workerTasks?.added?.length > 0) {
            console.log('\n  Sample added workerTask:', JSON.stringify(d.workerTasks.added[0], null, 4));
        }
        if (d.deficitTasks?.added?.length > 0) {
            console.log('\n  Sample deficit task:', JSON.stringify(d.deficitTasks.added[0], null, 4));
        }
        if (d.workerTasks?.deleted?.length > 0) {
            console.log('\n  Sample deleted ID:', d.workerTasks.deleted[0]);
        }

        console.log('\n📄 Full response (truncated to 3000 chars):');
        const full = JSON.stringify(d, null, 2);
        console.log(full.substring(0, 3000));
        if (full.length > 3000) console.log('... [truncated]');
    } catch (e: any) {
        console.log('❌ ERROR:', e.response?.status, e.response?.data || e.message);
    }

    console.log('\n=== Test 2: Empty taskUpdates (no changes, just fetch + diff) ===\n');

    try {
        const res = await axios.post(`${BASE}/api/v1/plans/adjust`, {
            taskUpdates: [],
            workerUpdates: []
        }, { timeout: 30000 });
        console.log('✅ STATUS:', res.status);
        const d = res.data;
        console.log('  workerTasks.added:', d.workerTasks?.added?.length);
        console.log('  workerTasks.updated:', d.workerTasks?.updated?.length);
        console.log('  workerTasks.deleted:', d.workerTasks?.deleted?.length);
        console.log('  deficitTasks.added:', d.deficitTasks?.added?.length);
    } catch (e: any) {
        console.log('❌ ERROR:', e.response?.status, e.response?.data || e.message);
    }

    console.log('\n=== Test 3: Validation — missing taskUpdates ===\n');

    try {
        await axios.post(`${BASE}/api/v1/plans/adjust`, {}, { timeout: 10000 });
        console.log('❌ Should have failed!');
    } catch (e: any) {
        console.log('✅ Correctly rejected:', e.response?.status, e.response?.data);
    }

    console.log('\n=== All tests complete ===');
}

main().catch(console.error);
