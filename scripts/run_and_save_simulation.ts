
import fs from 'fs';
import path from 'path';
import { PlanningService } from '../src/services/planningService';
import { parseExcelData } from '../src/utils/excelLoader';
import { generateResultsExcel } from '../src/utils/excelGenerator';
import { SimulationResult } from '../src/types';
import { VerificationService } from '../src/services/verificationService';

const INPUT_PATH = path.join(__dirname, '../sample_simulation 2.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../results.xlsx');

async function runAndSave() {
    console.log("🚀 Running Simulation with Zero-State Scheduler...");

    if (!fs.existsSync(INPUT_PATH)) {
        console.error("❌ Input file not found:", INPUT_PATH);
        process.exit(1);
    }

    // 1. Load Data
    const buffer = fs.readFileSync(INPUT_PATH);
    const { workers, tasks } = parseExcelData(buffer);
    console.log(`Loaded ${workers.length} workers, ${tasks.length} tasks.`);

    // 2. Plan (Dynamic dates: Tomorrow 8AM - 6PM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const shiftEnd = new Date(tomorrow);
    shiftEnd.setHours(20, 0, 0, 0); // 12-hour shift (Overtime allowed)

    const planner = new PlanningService();
    const rawSteps = planner.plan({
        workers,
        tasks,
        interval: {
            startTime: tomorrow.toISOString(),
            endTime: shiftEnd.toISOString()
        },
        useHistorical: false
    });

    // 3. Aggregate (Manual aggregation simulation for result typing)
    // We need 'SimulationResult' structure for the generator.
    // Let's implement basic aggregation or reuse scheduleAggregator if available, 
    // but for now, let's just map rawSteps to the expected format if possible.
    // Wait, excelGenerator expects 'SimulationResult' which has aggregated arrays.

    // Let's rely on the fact that rawSteps from PlanningService ARE the steps.
    // We need to group them.
    // Actually, `src/utils/scheduleAggregator.ts` exists. Let's use it.

    // We can't import aggregateSchedule easily if it's not exported or if I don't want to mess with imports.
    // Let's use the aggregator.

    const { aggregateSchedule } = require('../src/utils/scheduleAggregator');
    const result: SimulationResult = aggregateSchedule(rawSteps);

    console.log(`Generated ${result.assignments.length} assignments.`);


    // 4. Validate
    const verifier = new VerificationService();
    const report = verifier.validateSchedule(result, workers, tasks);

    // 5. Generate Excel
    const excelBuffer = generateResultsExcel(result, tasks, report);
    fs.writeFileSync(OUTPUT_PATH, excelBuffer);
    console.log(`✅ Results saved to: ${OUTPUT_PATH}`);
}

runAndSave();
