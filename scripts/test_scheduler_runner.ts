
import { SchedulingAdapterService, ExternalSchedulingInput } from '../src/services/schedulingAdapterService';

async function runTest() {
    console.log("Starting Scheduler Runner Test...");

    const adapter = new SchedulingAdapterService();

    // Mock Payload matching the "Runner" spec
    const startDate = "2026-02-05T07:00:00Z";
    const endDate = "2026-02-05T17:00:00Z";

    const input: ExternalSchedulingInput = {
        startDate,
        endDate,
        shifts: [
            {
                id: "prod-shift-1",
                shift: {
                    id: "shift-template-1",
                    startTime: 7 * 3600, // 07:00 AM
                    endTime: 15 * 3600,  // 03:00 PM
                    weekDayOrdinal: 1
                }
            },
            {
                id: "prod-shift-2",
                shift: {
                    id: "shift-template-2",
                    startTime: 15 * 3600, // 03:00 PM
                    endTime: 23 * 3600,   // 11:00 PM
                    weekDayOrdinal: 1
                }
            }
        ],
        tasks: [
            {
                id: "task-1",
                department: { id: "dept-1" },
                traveler: { id: "trav-1" },
                name: "Install Widget A",
                estimatedLaborHours: 2.5
            },
            {
                id: "task-2",
                department: { id: "dept-1" },
                traveler: { id: "trav-2" },
                name: "Inspect Widget B",
                estimatedLaborHours: 1.0
            }
        ]
    };

    console.log("Input constructed. Running Adapter...");
    try {
        const result = await adapter.run(input);
        console.log("--- Planning Successful ---");
        console.log(`Assignments: ${result.assignments.length}`);
        console.log(`Deficits: ${result.deficitTasks.length}`);
        console.log(`Worker Idle Time: ${result.idleWorkers.length} blocks`);

        console.log("First Assignment:", result.assignments[0]);

    } catch (error) {
        console.error("Planning Failed:", error);
    }
}

runTest();
