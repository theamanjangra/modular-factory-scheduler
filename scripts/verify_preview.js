
const axios = require('axios');
const fs = require('fs');

async function main() {
    console.log("Fetching Production Plan Preview (POST Mixed Mode)...");

    const payload = {
        options: {
            limit: 10,
            useShift2: true
        },
        task: [
            {
                id: "post-verify-task-1",
                department: { id: "dept-assembly" },
                traveler: { id: "trav-001" },
                name: "Manual Task A",
                estimatedLaborHours: 5.0,
                maxWorkers: 2,
                requiredSkills: ["Assembly"]
            },
            {
                id: "post-verify-task-2",
                department: { id: "dept-wiring" },
                traveler: { id: "trav-001" },
                name: "Manual Task B",
                estimatedLaborHours: 3.0,
                maxWorkers: 1
            }
        ],
        productionPlanShift: [
            // Optional: Add specific shifts here to verify shift parsing consistency if needed
        ]
    };

    try {
        // Note: query params still work for options, but we can also pass them in body if controller supports it.
        // Controller supports body.limit/etc.
        const response = await axios.post('http://localhost:3000/api/v1/worker-tasks/production-plan/preview?limit=10', payload);
        console.log("Status:", response.status);
        console.log("Data Size:", JSON.stringify(response.data).length);

        // Log keys to verify structure
        console.log("Response Keys:", Object.keys(response.data));
        if (response.data.shifts) {
            console.log("Shifts:", response.data.shifts.length);
            const firstShiftTasks = response.data.shifts[0]?.workerTasks;
            console.log("Shift 1 WorkerTasks:", firstShiftTasks?.length);
            if (firstShiftTasks && firstShiftTasks.length > 0) {
                console.log("Sample WorkerTask:", JSON.stringify(firstShiftTasks[0], null, 2));
            }
        }

        fs.writeFileSync('preview_verify.json', JSON.stringify(response.data, null, 2));
        console.log("Saved to preview_verify.json");
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

main();
