
import fs from 'fs';
import path from 'path';
import { PlanningService } from '../src/services/planningService';
import { generateResultsExcel } from '../src/utils/excelGenerator';
import { VerificationService } from '../src/services/verificationService';
import { aggregateSchedule } from '../src/utils/scheduleAggregator';

const DATA_PATH = path.join(__dirname, '../public/sample_data.json');
const OUTPUT_PATH = path.join(__dirname, '../results_josh.xlsx');

async function runJoshSimulation() {
    console.log("🚀 Running Simulation with 'Josh' Data (6 Workers)...");

    const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
    const input = JSON.parse(rawData);

    // Validate Input Structure
    if (!input.workers || !input.tasks || !input.interval) {
        console.error("❌ Invalid JSON structure in sample_data.json");
        process.exit(1);
    }

    console.log(`Loaded ${input.workers.length} workers, ${input.tasks.length} tasks.`);

    // Run Planner
    const planner = new PlanningService();
    const rawSteps = planner.plan({
        workers: input.workers,
        tasks: input.tasks,
        interval: input.interval,
        useHistorical: false
    });

    // Aggregate
    const result = aggregateSchedule(rawSteps);
    console.log(`Generated ${result.assignments.length} assignments.`);

    // Validate
    const verifier = new VerificationService();
    const report = verifier.validateSchedule(result, input.workers, input.tasks);

    console.log("\n--- Validation Report (Josh Data) ---");
    console.log(`Assignments: ${report.stats.totalAssignments}`);
    console.log(`Valid: ${report.stats.validAssignments}`);
    console.log(`Invalid: ${report.stats.invalidAssignments}`);

    if (report.hardConstraints.minWorkers.status === 'FAIL') console.warn("⚠️ MinWorkers Failed");
    if (report.hardConstraints.maxWorkers.status === 'FAIL') console.warn("⚠️ MaxWorkers Failed");

    // Save
    const excelBuffer = generateResultsExcel(result, input.tasks, report);
    fs.writeFileSync(OUTPUT_PATH, excelBuffer);
    console.log(`✅ Results saved to: ${OUTPUT_PATH}`);
}

runJoshSimulation();
