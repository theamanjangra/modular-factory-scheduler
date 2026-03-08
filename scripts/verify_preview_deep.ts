
import { WorkerTaskController } from '../src/controllers/workerTaskController';
import { PlanPreviewRequest } from '../src/types';
import { Request, Response } from 'express';

// Mock Express Request/Response
const mockRequest = (body: any): Request => ({
    body,
} as unknown as Request);

const mockResponse = (): Response => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.jsonData = data;
        return res;
    };
    return res as Response;
};

async function main() {
    console.log("Starting Verification of Deep Nesting...");

    const controller = new WorkerTaskController();

    // 1. Mock Request Body matching the Swift Client structure
    const requestBody: PlanPreviewRequest = {
        startTime: "2024-05-20T07:00:00Z",
        endTime: "2024-05-20T17:00:00Z",
        tasks: [
            {
                id: "task-1",
                department: { id: "dept-1" },
                traveler: { id: "trav-1" },
                name: "Test Task 1",
                estimatedTotalLaborHours: 1
            },
            {
                id: "task-2",
                department: { id: "dept-2" },
                traveler: { id: "trav-2" },
                name: "Test Task 2",
                estimatedTotalLaborHours: 1
            }
        ],
        productionPlanShifts: [
            {
                id: "shift-1",
                startTime: 1716188400, // Unix Timestamp for 7:00 AM
                endTime: 1716224400,   // Unix Timestamp for 5:00 PM
                weekDayOrdinal: 1
            }
        ]
    };

    const req = mockRequest(requestBody);
    const res = mockResponse();

    try {
        await controller.getProductionPlanPreview(req, res);

        const data = (res as any).jsonData;
        console.log("Response Status:", (res as any).statusCode || 200);

        if (!data) {
            console.error("No data returned!");
            process.exit(1);
        }

        // 2. Validate Root Structure
        if (!data.id || !data.productionPlanShifts) {
            console.error("Root structure mismatch: Missing id or productionPlanShifts");
            console.log(JSON.stringify(data, null, 2));
            process.exit(1);
        }

        const firstShift = data.productionPlanShifts[0];
        if (!firstShift) {
            console.error("No shifts returned");
            process.exit(1);
        }

        // 3. Validate Nested WorkerTask
        console.log(`Shift 1 has ${firstShift.workerTasks.length} worker tasks.`);
        if (firstShift.workerTasks.length > 0) {
            const firstWt = firstShift.workerTasks[0];

            // Check Worker Nesting
            if (!firstWt.worker || !firstWt.worker.id) {
                console.error("WorkerTask missing nested 'worker' object or ID");
                console.log("Failing WorkerTask:", JSON.stringify(firstWt, null, 2));
                process.exit(1);
            }
            if (!firstWt.worker.department || !firstWt.worker.department.id) {
                console.error("Worker missing nested 'department' object");
                console.log("Worker:", JSON.stringify(firstWt.worker, null, 2));
                process.exit(1);
            }
            console.log("Worker Department verified:", firstWt.worker.department);

            // Check Task Nesting
            if (!firstWt.task || !firstWt.task.id) {
                console.error("WorkerTask missing nested 'task' object");
                process.exit(1);
            }
            if (!firstWt.task.department || !firstWt.task.department.id) {
                console.error("Task missing nested 'department' object");
                console.log("Task:", JSON.stringify(firstWt.task, null, 2));
                process.exit(1);
            }
            console.log("Task Department verified:", firstWt.task.department);

            console.log("SUCCESS: Deep nesting structure verified.");
        } else {
            console.log("WARNING: No assignments made. Check if workers exist/logic ran correctly.");
            // Determine success based on structure even if empty assignments?
            // Ideally we want at least one assignment to verify structure.
        }

    } catch (e) {
        console.error("Verification Exec Error:", e);
        process.exit(1);
    }
}

main();
