
import * as fs from 'fs';
import * as path from 'path';
import { parseExcelData } from '../src/utils/excelLoader';
import { PlanningService } from '../src/services/planningService';
import { PlanRequest } from '../src/types';

const INPUT_FILE = path.resolve(__dirname, '../sample_simulation 2.xlsx');

async function benchmark() {
    console.log(`\n🔍 Benchmarking 8-Hour Shift (07:00 - 15:00)\n`);

    // 1. Load Data
    const buf = fs.readFileSync(INPUT_FILE);
    const data = await parseExcelData(buf);

    // 2. Setup Request
    const request: PlanRequest = {
        workers: data.workers,
        tasks: data.tasks,
        interval: {
            startTime: "2024-01-01T07:00:00Z",
            endTime: "2024-01-01T15:00:00Z" // 8 Hours
        },
        useHistorical: false
    };

    // 3. Run Planner
    const planner = new PlanningService();
    const steps = planner.plan(request);

    // 4. Calculate Completion
    // We need to sum the duration of all assignments that happened
    // This is tricky because the planner output (steps) is a mix of assignments and comments
    // But we are interested in *Task Progress*.
    // The Planner doesn't return the final state directly in V2?
    // Wait, PlanningService.plan returns `any[]` (steps). 
    // We can infer progress by looking at the assignments.

    let totalAssignedHours = 0;
    const assignments = steps.filter(s => s.type === 'assignment');

    assignments.forEach(a => {
        const dur = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
        totalAssignedHours += dur;
    });

    const totalRequired = data.tasks.reduce((sum, t) => sum + (t.estimatedTotalLaborHours || 0), 0);
    const theoreticalMax = 128; // 16 * 8

    console.log(`\n--- RESULTS ---`);
    console.log(`Total Work Required:  ${totalRequired.toFixed(2)} hrs`);
    console.log(`Theoretical Capacity: ${theoreticalMax.toFixed(2)} hrs`);
    console.log(`Actual Assigned Work: ${totalAssignedHours.toFixed(2)} hrs`);

    const pctOfRequired = (totalAssignedHours / totalRequired) * 100;
    const pctOfCapacity = (totalAssignedHours / theoreticalMax) * 100;

    console.log(`\nCompletion % (of Required): ${pctOfRequired.toFixed(2)}%`);
    console.log(`Efficiency % (of Capacity): ${pctOfCapacity.toFixed(2)}%`);

    const targetPct = (theoreticalMax / totalRequired) * 100;
    console.log(`Theoretical Max Completion %: ${targetPct.toFixed(2)}%`);

    console.log(`\nGap: ${(targetPct - pctOfRequired).toFixed(2)}%`);
}

benchmark().catch(console.error);
