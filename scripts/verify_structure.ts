
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Note: Ensure server is running on localhost:8080 or 3000
const API_URL = 'http://localhost:8080/api/v1/worker-tasks/plan';

const SAMPLE_REQ = {
    workers: [
        { workerId: "W1", skills: ["Assembly"], availability: { startTime: "2024-01-01T08:00:00Z", endTime: "2024-01-01T12:00:00Z" } },
        { workerId: "W2", skills: ["Assembly"] }
    ],
    tasks: [
        { taskId: "T1", name: "Task 1", estimatedTotalLaborHours: 2, minWorkers: 1, requiredSkills: ["Assembly"] },
        { taskId: "T2", name: "Task 2", estimatedTotalLaborHours: 10, minWorkers: 1, requiredSkills: ["Assembly"] } // Will be unfilled
    ],
    interval: {
        startTime: "2024-01-01T08:00:00Z",
        endTime: "2024-01-01T10:00:00Z"
    },
    useHistorical: false
};

async function verifyStructure() {
    console.log(`🚀 Testing Plan API Structure...`);

    try {
        const response = await axios.post(API_URL, SAMPLE_REQ);
        const data = response.data;

        console.log(`✅ Response Status: ${response.status}`);

        // Check Keys
        const keys = Object.keys(data);
        console.log(`Keys found: ${keys.join(', ')}`);

        if (Array.isArray(data.assignments) && Array.isArray(data.unassignedWorkers) && Array.isArray(data.unassignedTasks)) {
            console.log("✅ All 3 Required Arrays present.");
        } else {
            console.error("❌ Missing required arrays.");
            process.exit(1);
        }

        console.log(`Assignments: ${data.assignments.length}`);
        console.log(`Unassigned Workers: ${data.unassignedWorkers.length}`);
        console.log(`Unassigned Tasks: ${data.unassignedTasks.length}`);

        // Check contiguous
        // W1 should be assigned T1 for 2 hours (8-10). Should be 1 block.
        const w1 = data.assignments.find((a: any) => a.workerId === 'W1');
        if (w1) {
            console.log(`W1 Assignment: ${w1.startDate} -> ${w1.endDate}`);
            if (w1.startDate === "2024-01-01T08:00:00.000Z" && w1.endDate === "2024-01-01T10:00:00.000Z") {
                console.log("✅ Aggregation seems correct (2h block).");
            } else {
                console.warn("⚠️ Aggregation might be fragmented.");
            }
        }

    } catch (error: any) {
        if (error.response) {
            console.error(`❌ API Error: ${error.response.status} - ${error.response.statusText}`);
            console.error(error.response.data);
        } else {
            console.error(`❌ Network Error: ${error.message}`);
        }
        process.exit(1);
    }
}

verifyStructure();
