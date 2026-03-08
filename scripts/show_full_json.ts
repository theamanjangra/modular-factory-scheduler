import axios from 'axios';

async function main() {
    const url = 'https://modular-factory-api-270427255064.us-central1.run.app/api/v1/worker-tasks/production-plan/preview';

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

    console.log('========== INPUT JSON ==========');
    console.log(JSON.stringify(payload, null, 2));
    console.log('================================\n');

    const response = await axios.post(url, payload);

    console.log('========== OUTPUT JSON ==========');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('=================================');
}

main().catch(e => { console.error(e.response?.data || e.message); process.exit(1); });
