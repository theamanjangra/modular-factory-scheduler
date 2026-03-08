import axios from 'axios';

async function main() {
    console.log("Calling LIVE Preview Plan endpoint...");

    const payload = {
        options: { limit: 10 },
        tasks: [
            {
                id: "1ad5f0fb-77fe-41f2-ae2b-d36c53f7f8d6", // Dummy generic task ID to test endpoint connectivity
                name: "Test Task",
                estimatedTotalLaborHours: 10,
                department: { id: "dept-1" }
            }
        ],
        productionPlanShifts: [
            {
                shiftId: "shift-1",
                productionRate: 1.0,
                shift: {
                    id: "shift-1",
                    startTime: "2024-01-01T07:00:00Z",
                    endTime: "2024-01-01T17:00:00Z"
                }
            }
        ]
    };

    try {
        const response = await axios.post('https://modular-factory-api-270427255064.us-central1.run.app/api/v1/worker-tasks/production-plan/preview', payload);
        console.log("✅ LIVE API Success! HTTP 200");
    } catch (error: any) {
        console.error("❌ LIVE API Failed!");
        console.error("HTTP Status:", error.response?.status);
        if (error.response?.data) {
            console.error("Error Detail:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

main();
