
import { PlanningService } from '../src/services/planningService';
import { MultiShiftPlanningService } from '../src/services/multiShiftPlanningService';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    console.log('Running Dependency Violation Repro...');

    const dataPath = path.join(process.cwd(), 'data/building_envelope_plan_request.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found!');
        return;
    }

    const inputData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Assuming we use MultiShiftPlanningService for file-based planning (based on usePlanData.ts usage)
    // Or maybe PlanningService? The user said "plan-file" endpoint.
    // Let's try to mimic planController.ts logic for /plan-file endpoint.
    // Actually, verify_adjustment_logic.ts uses PlanAdjustmentService, but here we are talking about initial planning.

    const planningService = new PlanningService();

    // Convert string ISO dates to local context if needed, but PlanningService expects strings in interval
    const requestData = {
        workers: inputData.workers,
        tasks: inputData.tasks,
        interval: inputData.interval,
        useHistorical: false
    };

    console.log(`Planning with ${requestData.workers.length} workers and ${requestData.tasks.length} tasks...`);

    const result = planningService.plan(requestData);

    // Analyze result for violation
    // Violation: t_13 starts before t_8 is complete
    // t_8 depends on t_7. So t_7 -> t_8 -> t_13

    // Find all assignments for relevant tasks
    const t7_assigns = result.filter((a: any) => a.taskId === 't_7');
    const t8_assigns = result.filter((a: any) => a.taskId === 't_8');
    const t13_assigns = result.filter((a: any) => a.taskId === 't_13');

    // Get t_8 max end time
    let t8_end = 0;
    t8_assigns.forEach((a: any) => {
        const end = new Date(a.endDate || a.endTime).getTime();
        if (end > t8_end) t8_end = end;
    });

    // Get t_13 min start time
    let t13_start = Number.MAX_SAFE_INTEGER;
    t13_assigns.forEach((a: any) => {
        const start = new Date(a.startDate || a.startTime).getTime();
        if (start < t13_start) t13_start = start;
    });

    console.log(`t_8 (Prereq) Ends at: ${new Date(t8_end).toISOString()}`);
    console.log(`t_13 (Dependent) Starts at: ${t13_start === Number.MAX_SAFE_INTEGER ? 'N/A' : new Date(t13_start).toISOString()}`);

    if (t13_start < t8_end) {
        console.error("FAIL: Dependency Violation Detected! t_13 started before t_8 finished.");
        console.log(`Diff: ${(t8_end - t13_start) / 60000} minutes overlap`);
    } else {
        if (t8_assigns.length === 0) {
            console.error("FAIL: Prerequisite t_8 was never scheduled!");
            if (t13_assigns.length > 0) {
                console.error("...but t_13 WAS scheduled. Critical Violation.");
            }
        } else {
            console.log("PASS: Dependencies respected.");
        }
    }

}

run();
