
import { parseExcelData } from '../src/utils/excelLoader';
import { PlanningService } from '../src/services/planningService';
import { PlanRequest, SimulationResult } from '../src/types';
import { aggregateSchedule } from '../src/utils/scheduleAggregator';
import * as fs from 'fs';
import * as path from 'path';

const DEBUG_FILE_PATH = '/Users/deepanshusingh/Desktop/Getting the One Piece/Builds/modular_factory/Structural-simulation.xlsx';

async function runDebug() {
    console.log(`\n=== DEBUGGING CRASH: ${path.basename(DEBUG_FILE_PATH)} ===`);

    try {
        if (!fs.existsSync(DEBUG_FILE_PATH)) {
            console.error(`ERROR: File not found at ${DEBUG_FILE_PATH}`);
            return;
        }

        console.log("1. Parsing Excel File...");
        const fileBuffer = fs.readFileSync(DEBUG_FILE_PATH);
        const { workers, tasks } = parseExcelData(fileBuffer);
        console.log(`   - Workers found: ${workers.length}`);
        console.log(`   - Tasks found: ${tasks.length}`);

        if (workers.length === 0 || tasks.length === 0) {
            console.warn("   WARNING: Workers or Tasks are empty. This might cause issues.");
        }

        console.log("2. running PlanningService.plan()...");
        const service = new PlanningService();
        const request: PlanRequest = {
            workers: workers,
            tasks: tasks,
            interval: {
                startTime: "2024-01-01T07:00:00Z",
                endTime: "2024-01-01T17:00:00Z" // 10 hour shift
            },
            useHistorical: false
        };

        const rawSteps = service.plan(request);
        console.log(`   - Raw Steps generated: ${rawSteps.length}`);

        // Analyze Raw Steps Types
        const types = rawSteps.reduce((acc: any, step: any) => {
            acc[step.type] = (acc[step.type] || 0) + 1;
            return acc;
        }, {});
        console.log("   - Step Types Breakdown:", types);

        console.log("3. Aggregating Schedule...");
        const result = aggregateSchedule(rawSteps);

        console.log("3. Planning Complete. Analyzing Result...");
        console.log(`   - Output Assignments: ${result?.assignments?.length}`);
        console.log(`   - Unassigned Tasks: ${result?.unassignedTasks?.length}`);
        console.log(`   - Story Items: ${result?.story?.length}`);

        // Log Task Data to see if constraints are blocking
        console.log("\n--- TASK DATA INSPECTION ---");
        tasks.forEach(t => {
            console.log(`Task [${t.taskId}]: EstHours=${t.estimatedTotalLaborHours}, MinWorkers=${t.minWorkers}, StartDate=${t.earliestStartDate}, Prereqs=${t.prerequisiteTaskIds}`);
        });

        // Check for anomalies that might crash Frontend
        const assignmentsWithNulls = result.assignments?.filter((a: any) => !a.workerId || !a.taskId || !a.startDate || !a.endDate) || [];
        if (assignmentsWithNulls.length > 0) {
            console.error("   CRITICAL: Found assignments with NULL values!", assignmentsWithNulls);
        }

        const nanDates = result.assignments?.filter((a: any) => a.startDate === 'Invalid Date' || a.endDate === 'Invalid Date') || [];
        if (nanDates.length > 0) {
            console.error("   CRITICAL: Found Invalid Dates!", nanDates);
        }

        // Verify Assignments
        console.log("--- WORKER ASSIGNMENMT DISTRIBUTION ---");
        const dist: Record<string, number> = {};
        result.assignments.forEach(a => {
            dist[a.workerId] = (dist[a.workerId] || 0) + 1;
        });
        console.log(JSON.stringify(dist, null, 2));

        console.log("\n=== SUCCESS: Backend ran without crashing. ===");
        console.log("If this script succeeds, the 'Blank Screen' is likely a Frontend React Error handling this specific data shape.");

    } catch (error) {
        console.error("\n=== CRASH DETECTED IN BACKEND ===");
        console.error(error);
    }
}

runDebug();
