
import axios from 'axios';

async function main() {
    const url = 'https://modular-factory-api-270427255064.us-central1.run.app/api/v1/worker-tasks/production-plan/preview';
    console.log(`Sending request to ${url}...`);

    try {
        const payload = {
            "startTime": "2024-01-01T06:00:00Z",
            "endTime": "2024-01-01T23:00:00Z",
            "tasks": [
                {
                    "id": "00000000-0000-0000-0000-000000000001",
                    "name": "Fake Task 1",
                    "department": { "id": "11111111-1111-1111-1111-111111111111" },
                    "traveler": { "id": "22222222-2222-2222-2222-222222222222" }
                },
                { "id": "00000000-0000-0000-0000-000000000002", "name": "Fake Task 2" }
            ],
            "productionPlanShifts": [
                {
                    "id": "pps-1",
                    "shift": {
                        "id": "shift-def-1",
                        "startTime": "2024-01-01T06:00:00Z",
                        "endTime": "2024-01-01T14:30:00Z"
                    }
                },
                {
                    "id": "pps-2",
                    "shift": {
                        "id": "shift-def-2",
                        "startTime": "2024-01-01T14:30:00Z",
                        "endTime": "2024-01-01T23:00:00Z"
                    }
                }
            ]
        };

        const response = await axios.post(url, payload);
        console.log('✅ Success! Status:', response.status);
        console.log('Response Keys:', Object.keys(response.data));
        console.log('ProductionPlanShifts count:', response.data.productionPlanShifts?.length);

        // Check if we got worker tasks
        const shifts = response.data.productionPlanShifts || [];
        shifts.forEach((s: any, i: number) => {
            console.log(`Shift ${i} WorkerTasks:`, s.workerTasks?.length);
            console.log(`Shift ${i} DeficitTasks:`, s.deficitTasks?.length);

            if (s.workerTasks?.length > 0) {
                const wt = s.workerTasks[0];
                console.log(`[Shift ${i} Example WT] ID:`, wt.id);
                console.log(`   Worker:`, JSON.stringify(wt.worker, null, 2));
                console.log(`   Task:`, JSON.stringify(wt.task, null, 2));
            }
        });

    } catch (error: any) {
        console.error('❌ Error calling endpoint:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

main();
