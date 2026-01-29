
import fs from 'fs';
import path from 'path';
import { parseExcelData } from '../src/utils/excelLoader';
import { PlanningService } from '../src/services/planningService';
import { aggregateSchedule } from '../src/utils/scheduleAggregator';
import { PlanRequest, AggregatedAssignment } from '../src/types';
import { VerificationService } from '../src/services/verificationService';

// Colors for Console
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

const INPUT_FILE = path.resolve(__dirname, '../sample_simulation 2.xlsx');

console.log(`${BOLD}${CYAN}
================================================================
   ⚔️  V E D E R R A   V I S U A L   G A U N T L E T  ⚔️
   "Proof of Logic" & ATDD Verification
================================================================
${RESET}`);

async function runVisualGauntlet() {
    // 1. Load Data
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`${RED}❌ Input file missing: ${INPUT_FILE}${RESET}`);
        process.exit(1);
    }
    const buffer = fs.readFileSync(INPUT_FILE);
    const { workers, tasks } = parseExcelData(buffer);
    console.log(`${GREEN}✔ Loaded ${workers.length} Workers & ${tasks.length} Tasks${RESET}\n`);

    // CHECK FOR DUPLICATES
    const names = tasks.map(t => t.name);
    const dupeNames = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupeNames.length > 0) {
        console.warn(`${RED}⚠ WARNING: Duplicate Task Names Found: ${[...new Set(dupeNames)].join(', ')}${RESET}`);
        console.warn(" This causes Split Split assignments (1 worker to ID_1, 1 worker to ID_2), causing MinWorkers failures.");
    }

    // 2. Execute Logic
    console.log(`${YELLOW}⚡ Executing Planning Algorithm...${RESET}`);
    const now = new Date();
    now.setUTCHours(8, 0, 0, 0);
    const start = now.toISOString();
    now.setUTCHours(17, 0, 0, 0);
    const end = now.toISOString();

    const planner = new PlanningService();
    const rawSteps = planner.plan({
        workers,
        tasks,
        interval: { startTime: start, endTime: end },
        useHistorical: false
    });

    const aggregated = aggregateSchedule(rawSteps);
    const assignments = aggregated.assignments;
    console.log(`${GREEN}✔ Generated ${assignments.length} Assignments${RESET}\n`);

    // -------------------------------------------------------------
    // VISUAL CHECK 1: PREREQUISITES (Gantt)
    // -------------------------------------------------------------
    console.log(`${BOLD}1. [PREREQUISITES] Dependency Chain Visualization${RESET}`);
    // Find tasks with dependencies
    const dependentTasks = tasks.filter(t => t.prerequisiteTaskIds && t.prerequisiteTaskIds.length > 0);

    if (dependentTasks.length === 0) {
        console.log("   No prerequisites found in dataset.");
    } else {
        dependentTasks.forEach(child => {
            child.prerequisiteTaskIds?.forEach(parentId => {
                const parent = tasks.find(t => t.taskId === parentId);
                const parentName = parent?.name || parentId;
                const childName = child.name || child.taskId;

                // Find Time Ranges
                const parentAssigns = assignments.filter(a => a.taskId === parentId);
                const childAssigns = assignments.filter(a => a.taskId === child.taskId);

                if (parentAssigns.length === 0 || childAssigns.length === 0) {
                    console.log(`   ${YELLOW}⚠ Skipping ${childName} (Incomplete Schedule)${RESET}`);
                    return;
                }

                // Get min/max times
                const pEnd = Math.max(...parentAssigns.map(a => new Date(a.endDate).getTime()));
                const cStart = Math.min(...childAssigns.map(a => new Date(a.startDate).getTime()));

                const pEndStr = new Date(pEnd).toISOString().substr(11, 5);
                const cStartStr = new Date(cStart).toISOString().substr(11, 5);

                // Validation Status
                const passed = cStart >= pEnd;
                const status = passed ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;

                console.log(`   ${status} ${parentName} -> ${childName}`);
                console.log(`         [${parentName} Ends: ${pEndStr}]`);
                console.log(`         [${childName} Starts: ${cStartStr}]`);

                // Mini Ascii Gantt
                // Scale: 08:00 to 17:00 (9 hours)
                // Normalize to chars
                const drawBar = (s: number, e: number, char: string) => {
                    const dayStart = new Date(start).getTime();
                    const totalMs = 9 * 60 * 60 * 1000;
                    const offset = Math.max(0, s - dayStart); // Safety
                    const width = Math.max(0, e - s);

                    const leftPad = Math.floor((offset / totalMs) * 40);
                    const barWidth = Math.ceil((width / totalMs) * 40);
                    return " ".repeat(leftPad) + char.repeat(barWidth);
                };

                console.log(`         ${parentName.substr(0, 10)}: |${drawBar(Math.min(...parentAssigns.map(a => new Date(a.startDate).getTime())), pEnd, "=")}|`);
                console.log(`         ${childName.substr(0, 10)}:  |${drawBar(cStart, Math.max(...childAssigns.map(a => new Date(a.endDate).getTime())), "=")}|`);
                console.log("");
            });
        });
    }

    // -------------------------------------------------------------
    // VISUAL CHECK 2: CAPACITY (Active Count vs Min/Max)
    // -------------------------------------------------------------
    console.log(`${BOLD}2. [CAPACITY] Staffing Level Heatmap${RESET}`);
    // Check Top 3 Critical Tasks
    const tasksToCheck = tasks.slice(0, 3);

    tasksToCheck.forEach(task => {
        console.log(`   Task: ${task.name} (Min: ${task.minWorkers}, Max: ${task.maxWorkers})`);
        // Iterate time slices (30 mins)
        let time = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        let timeline = "";

        while (time < endTime) {
            const next = time + 30 * 60000;
            // Count active workers in this slice
            const active = assignments.filter(a =>
                a.taskId === task.taskId &&
                new Date(a.startDate).getTime() <= time &&
                new Date(a.endDate).getTime() >= next
            ).length;

            let color = GREEN;
            if (active < (task.minWorkers || 1) && active > 0) color = RED; // Below Min but active
            if (active > (task.maxWorkers || 100)) color = RED; // Above Max
            if (active === 0) color = "\x1b[90m"; // Grey (Idle)

            timeline += `${color}[${active}]${RESET}`;
            time = next;
        }
        console.log(`   Timeline: ${timeline}`);
    });
    console.log("");

    // -------------------------------------------------------------
    // VISUAL CHECK 3: OPTIMIZATION (Continuity)
    // -------------------------------------------------------------
    console.log(`${BOLD}3. [OPTIMIZATION] Continuity & Swarming${RESET}`);
    // Check fragmentation
    const shortAssigns = assignments.filter(a => {
        const dur = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / 36e5;
        return dur < 1.0;
    });

    if (shortAssigns.length === 0) {
        console.log(`   ${GREEN}PASS${RESET} No assignments < 1 Hour (Fragmentation Minimized).`);
    } else {
        console.log(`   ${YELLOW}WARN${RESET} ${shortAssigns.length} Short Assignments Detected (Check if Finishers).`);
    }

    // Calculate Switch Score (Avg Assignments per Worker)
    const uniqueWorkers = new Set(assignments.map(a => a.workerId));
    const avgSwaps = assignments.length / uniqueWorkers.size;
    console.log(`   Avg Swaps/Worker: ${avgSwaps.toFixed(2)} (Target: < 3.0)`);
    console.log(`   ${avgSwaps < 3.0 ? GREEN + "PASS" : YELLOW + "WARN"}${RESET}`);
    console.log("");


    // -------------------------------------------------------------
    // VISUAL CHECK 4: ZERO-STATE INTEGRITY
    // -------------------------------------------------------------
    console.log(`${BOLD}4. [ZERO-STATE INTEGRITY] Double Booking Check${RESET}`);
    const verifier = new VerificationService();
    const result = { assignments, unassignedWorkers: [], unassignedTasks: [] };
    const report = verifier.validateSchedule(result, workers, tasks);

    const dbCount = report.hardConstraints.doubleBooking.violations.length;
    const dbStatus = dbCount === 0 ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;

    console.log(`   Double Booking Violations: ${dbCount} -> ${dbStatus}`);

    if (report.stats.invalidAssignments === 0) {
        console.log(`\n${GREEN}${BOLD}✅  G A U N T L E T   P A S S E D  ✅${RESET}`);
    } else {
        console.log(`\n${RED}${BOLD}❌  G A U N T L E T   F A I L E D  ❌${RESET}`);
        console.log("Violations:");
        if (report.hardConstraints.minWorkers.violations.length) console.log(report.hardConstraints.minWorkers.violations[0]);
    }
}

runVisualGauntlet();
