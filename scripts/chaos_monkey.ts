
import fs from 'fs';
import path from 'path';
import { parseExcelData } from '../src/utils/excelLoader';
import { PlanningService } from '../src/services/planningService';
import { aggregateSchedule } from '../src/utils/scheduleAggregator';
import { VerificationService } from '../src/services/verificationService';
import { Worker, Task, Interval, WorkerTask } from '../src/types';
import { ResourceManager } from '../src/services/resourceManager';

// Paths
const INPUT_FILE = path.resolve(__dirname, '../sample_simulation 2.xlsx');
const FAILURE_LOG = path.resolve(__dirname, 'test_failures.jsonl');

// Limits
const MAX_ITERATIONS = 100;
const MAX_FAILURES = 5;

// Types
type Strategy = 'STARVATION' | 'BOTTLENECK' | 'DEPENDENCY_HELL' | 'SWISS_CHEESE' | 'MICRO_TASKS' | 'OVERLOAD' | 'DUPLICATE_WORKERS' | 'SHIFT_DROPOFF' | 'PROVEN_FAIL' | 'RANDOM_CHAOS';

console.log("🐵 STARTING OPERATION CHAOS MONKEY: PHASE 3 (LOGICAL SIEGE) 🐵");

function deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

async function runChaos() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("❌ Input file missing.");
        process.exit(1);
    }

    // Clear previous logs
    if (fs.existsSync(FAILURE_LOG)) fs.unlinkSync(FAILURE_LOG);

    const buffer = fs.readFileSync(INPUT_FILE);
    const baseData = parseExcelData(buffer);

    let failureCount = 0;

    const HARD_LIMIT = 2000; // Increased limit

    for (let i = 0; i < HARD_LIMIT; i++) {
        if (failureCount >= MAX_FAILURES) break;

        const strategy = getStrategy(i);
        // Print less frequently to avoid spamming console
        if (i % 100 === 0) console.log(`[Iteration ${i + 1}/${HARD_LIMIT}] Strategy: ${strategy} (Failures: ${failureCount})`);

        // 1. Mutate Data
        const workers = deepCopy(baseData.workers);
        const tasks = deepCopy(baseData.tasks);

        switch (strategy) {
            case 'STARVATION':
                workers.splice(0, Math.ceil(workers.length * 0.7));
                break;
            case 'BOTTLENECK':
                const skill = "Tape and install windows";
                tasks.forEach(t => t.requiredSkills = [skill]);
                break;
            case 'DEPENDENCY_HELL':
                tasks.sort((a, b) => a.taskId.localeCompare(b.taskId));
                for (let j = 1; j < tasks.length; j++) tasks[j].prerequisiteTaskIds = [tasks[j - 1].taskId];
                break;
            case 'SWISS_CHEESE':
                // Force failure: Everyone takes a lunch break at 12:00-13:00.
                // Planner ignores this and assigns work. Verification catches it.
                workers.forEach(w => {
                    // Break in middle of day
                    // We simulate this by splitting availability? No, interface only supports one Interval.
                    // So we restrict them to Morning Only, but Task needs Afternoon steps.
                    // Or just Early/Late shifts mismatch.
                    // Let's use RANDOM gaps but with high probability.
                    if (Math.random() < 0.8) {
                        // Available 08:00 - 12:00 ONLY
                        const startMs = new Date().setUTCHours(8, 0, 0, 0);
                        const endMs = new Date().setUTCHours(12, 0, 0, 0);
                        w.availability = {
                            startTime: new Date(startMs).toISOString(),
                            endTime: new Date(endMs).toISOString()
                        };
                    }
                });
                break;

            case 'MICRO_TASKS':
                // Set all tasks to 0.1 hours (6 mins)
                // This tests if the scheduler assigns short blocks correctly or over-assigns.
                tasks.forEach(t => t.estimatedRemainingLaborHours = 0.5); // 30 mins
                // Make sure they fit in the day
                break;

            case 'OVERLOAD':
                // High Min but logically consistent with Max
                tasks.forEach(t => {
                    t.minWorkers = 10;
                    t.maxWorkers = 20;
                });
                break;

            case 'DUPLICATE_WORKERS':
                // Clone the first worker 5 times with SAME ID
                // This mimics a data integrity issue.
                // If the system treats them as distinct resources but writes to same ID, we get Double Booking.
                const clone = workers[0];
                for (let k = 0; k < 3; k++) workers.push(clone); // Literal same reference/ID
                break;

            case 'SHIFT_DROPOFF':
                // ALL Workers leave at 12:00.
                // Tasks need 8 hours.
                // Planner will assign them 13:00-17:00 anyway.
                const dayStart = new Date().setUTCHours(8, 0, 0, 0);
                const noon = new Date().setUTCHours(12, 0, 0, 0);

                workers.forEach(w => {
                    w.availability = { startTime: new Date(dayStart).toISOString(), endTime: new Date(noon).toISOString() };
                });
                // Ensure tasks are long
                tasks.forEach(t => t.estimatedRemainingLaborHours = 6.0);
                break;

            case 'PROVEN_FAIL':
                // Single Worker: Morning Only (08-12)
                // Task: Afternoon (13-17)
                // This MUST fail if the Algo is blind.
                const amStart = new Date().setUTCHours(8, 0, 0, 0);
                const amEnd = new Date().setUTCHours(12, 0, 0, 0);
                workers.splice(1); // Keep only 1 worker
                workers[0].availability = { startTime: new Date(amStart).toISOString(), endTime: new Date(amEnd).toISOString() };
                workers[0].preferences = { 'Tape and install windows': 1 }; // CRITICAL: Force Positive Preference
                workers[0].preferences['Measure and install baffels'] = 1; // Backup
                workers[0].preferences['Stocking'] = 1; // Backup
                // Task needs to force work in Afternoon
                // We can't force StartTime directly in Task object (Planning decides).
                // But if we simulate 08:00 - 17:00 interval, and Task is estimated 8 hours.
                // It will try to fill 13:00-17:00.
                tasks.forEach(t => {
                    t.estimatedRemainingLaborHours = 8.0;
                    t.minWorkers = 1; // CRITICAL: Ensure it tries to assign the single worker
                    t.requiredSkills = []; // CRITICAL: Remove skill barrier
                });
                break;

            case 'RANDOM_CHAOS':
                if (Math.random() > 0.5) workers.splice(0, 5);

                // Randomly mutate tasks but maintain internal consistency
                tasks.forEach(t => {
                    if (Math.random() > 0.5) {
                        const newMin = Math.floor(Math.random() * 5) + 1;
                        t.minWorkers = newMin;
                        // Always ensure Max >= Min
                        t.maxWorkers = Math.max(t.maxWorkers || 10, newMin + Math.floor(Math.random() * 5));
                    }
                    if (Math.random() > 0.7) t.estimatedRemainingLaborHours = Math.random() * 4 + 0.5;
                });
                break;
        }

        // 2. Planning
        const now = new Date();
        now.setUTCHours(8, 0, 0, 0);
        const start = now.toISOString();
        now.setUTCHours(17, 0, 0, 0);
        const end = now.toISOString();

        try {
            const planner = new PlanningService();
            const rawSteps = planner.plan({
                workers,
                tasks,
                interval: { startTime: start, endTime: end },
                useHistorical: false
            });

            const aggregated = aggregateSchedule(rawSteps);
            const result = aggregated;

            // 3. Verification
            const verifier = new VerificationService();
            const report = verifier.validateSchedule(result, workers, tasks);

            if (report.stats.invalidAssignments > 0) {
                console.error(`\n❌ FAILURE at Iteration ${i} (${strategy})`);
                // Console Log first violation for immediate visibility
                if (report.hardConstraints.doubleBooking.violations.length > 0) console.log("   Double Booking!");
                if (report.hardConstraints.minWorkers.violations.length > 0) console.log("   Min Workers Violation!");

                const logEntry = {
                    iteration: i,
                    strategy,
                    violations: report.hardConstraints,
                    assignments: result.assignments
                };
                fs.appendFileSync(FAILURE_LOG, JSON.stringify(logEntry) + '\n');
                failureCount++;
            } else {
                if (i % 100 === 0) console.log(`   ✅ PASS (Valid: ${report.stats.validAssignments}, Unassigned Tasks: ${result.unassignedTasks.length})`);
            }

        } catch (err: any) {
            // Crashes are also Failures
            console.error(`💥 CRASH at ${i}: ${err.message}`);
            fs.appendFileSync(FAILURE_LOG, JSON.stringify({ iteration: i, strategy, error: err.message }) + '\n');
            failureCount++;
        }
    }

    console.log(`\nDONE. Total Failures: ${failureCount}`);
    if (failureCount > 0) {
        console.log(`See ${FAILURE_LOG} for details.`);
    }
}

function getStrategy(i: number): Strategy {
    const modes: Strategy[] = [
        'STARVATION', 'BOTTLENECK', 'DEPENDENCY_HELL', 'SWISS_CHEESE',
        'MICRO_TASKS', 'OVERLOAD', 'DUPLICATE_WORKERS', 'SHIFT_DROPOFF', 'PROVEN_FAIL', 'RANDOM_CHAOS'
    ];
    return modes[i % modes.length];
}

runChaos();
