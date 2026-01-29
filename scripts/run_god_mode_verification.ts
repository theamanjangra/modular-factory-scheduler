
import fs from 'fs';
import path from 'path';
import { parseExcelData } from '../src/utils/excelLoader';
import { PlanningService } from '../src/services/planningService';
import { aggregateSchedule } from '../src/utils/scheduleAggregator';
import { generateResultsExcel } from '../src/utils/excelGenerator';
import { VerificationService } from '../src/services/verificationService';
import { PlanRequest } from '../src/types';

// Paths
const INPUT_FILE = path.resolve(__dirname, '../sample_simulation 2.xlsx');
const OUTPUT_FILE = path.resolve(__dirname, '../results (1).xlsx');

console.log(`⚔️ GOD-MODE VERIFICATION ⚔️`);
console.log(`Input: ${INPUT_FILE}`);
console.log(`Output: ${OUTPUT_FILE}`);

async function runGodMode() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file not found: ${INPUT_FILE}`);
        process.exit(1);
    }

    try {
        // 1. Load Data
        const buffer = fs.readFileSync(INPUT_FILE);
        const { workers, tasks } = parseExcelData(buffer);
        console.log(`Loaded ${workers.length} workers and ${tasks.length} tasks.`);

        // 2. Define Interval (Standard Work Day + Next Day Lookahead?)
        // Requirement: "Input test data in sample_simulation 2.xlsx"
        // We assume standard constraints unless specified in file (which we parse).
        // Let's use a standard 08:00 - 17:00 window for "Next Business Day".

        // Find next Monday or tomorrow?
        const now = new Date();
        now.setUTCHours(8, 0, 0, 0);
        const startTime = now.toISOString();
        now.setUTCHours(17, 0, 0, 0);
        const endTime = now.toISOString();

        console.log(`Planning Interval: ${startTime} to ${endTime}`);

        const request: PlanRequest = {
            workers,
            tasks,
            interval: { startTime, endTime },
            useHistorical: false
        };

        // 3. Execution (The Solver)
        const planner = new PlanningService();
        const rawSteps = planner.plan(request);
        console.log(`Generated ${rawSteps.length} raw steps.`);

        // 4. Aggregation
        const aggregated = aggregateSchedule(rawSteps);
        const result = {
            ...aggregated,
            items: aggregated.assignments
        };

        // 5. Verification (The Audit)
        console.log(`--- Verifying Constraints ---`);
        const verifier = new VerificationService();
        const report = verifier.validateSchedule(result, workers, tasks);

        console.log(`Assignments: ${report.stats.totalAssignments}`);
        console.log(`Valid: ${report.stats.validAssignments}`);
        console.log(`Invalid: ${report.stats.invalidAssignments}`);

        if (report.stats.invalidAssignments > 0) {
            console.error(`❌ CRITICAL FAILURE: Found invalid assignments.`);
            report.hardConstraints.minWorkers.violations.forEach(v => console.error(v));
            report.hardConstraints.maxWorkers.violations.forEach(v => console.error(v));
            report.hardConstraints.skills.violations.forEach(v => console.error(v));
            report.hardConstraints.prerequisites.violations.forEach(v => console.error(v));
            // In God Mode, any invalid assignment is a failure.
            process.exit(1);
        }

        // 6. Optimization Check (Heuristic)
        // Check for Swarming (Assignments < 1 Hour)

        // Build Task End Times to distinguish "Finishing" vs "Churning"
        const taskLastEnd = new Map<string, number>();
        result.assignments.forEach(a => {
            const end = new Date(a.endDate).getTime();
            const current = taskLastEnd.get(a.taskId) || 0;
            if (end > current) taskLastEnd.set(a.taskId, end);
        });

        const churnAssignments = result.assignments.filter(a => {
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();
            const durationHrs = (end - start) / (1000 * 60 * 60);

            // It's strictly churn if:
            // 1. It's short (< 1h)
            // 2. AND it's NOT the final block for this task (Task continues later)
            const isFinalBlock = (end === taskLastEnd.get(a.taskId));

            return durationHrs < 1.0 && !isFinalBlock;
        });

        if (churnAssignments.length > 0) {
            console.warn(`⚠️ WARNING: ${churnAssignments.length} assignments are Bad Churn (<1h and not finishing).`);
            churnAssignments.forEach(a => console.log(`   - [${a.taskId}] ${a.workerId} (${a.startDate})`));
        } else {
            console.log(`✅ ANTI-FRAGMENTATION: No bad churn detected. Short assignments are finishers.`);
        }

        // 7. Output Generation
        console.log(`Writing output to ${OUTPUT_FILE}...`);
        const outputBuffer = generateResultsExcel(result, tasks, report);
        fs.writeFileSync(OUTPUT_FILE, outputBuffer);

        console.log(`✅ GOD MODE SUCCESS. Output saved.`);

    } catch (error) {
        console.error("❌ Unexpected Error:", error);
        process.exit(1);
    }
}

runGodMode();
