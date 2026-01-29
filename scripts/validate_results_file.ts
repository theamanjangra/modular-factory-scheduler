
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parseExcelData } from '../src/utils/excelLoader';
import { Worker, Task } from '../src/types';

// Paths
const INPUT_EXCEL_PATH = path.join(__dirname, '../sample_simulation 2.xlsx');
const OUTPUT_EXCEL_PATH = path.join(__dirname, '../results.xlsx');

interface LoadedAssignment {
    taskId: string;
    workerId: string;
    startDate: string;
    endDate: string;
}

async function validateResults() {
    console.log("🚀 Starting Validation of 'results.xlsx'...");

    // 1. Check Files
    if (!fs.existsSync(INPUT_EXCEL_PATH)) {
        console.error(`❌ Input file missing: ${INPUT_EXCEL_PATH}`);
        process.exit(1);
    }
    if (!fs.existsSync(OUTPUT_EXCEL_PATH)) {
        console.error(`❌ Results file missing: ${OUTPUT_EXCEL_PATH}`);
        process.exit(1);
    }

    // 2. Load Input Data (Definitions)
    console.log(`Loading Definitions from: ${path.basename(INPUT_EXCEL_PATH)}`);
    const inputBuffer = fs.readFileSync(INPUT_EXCEL_PATH);
    const { workers, tasks } = parseExcelData(inputBuffer);

    const workersMap = new Map<string, Worker>(workers.map(w => [w.workerId, w]));
    const tasksMap = new Map<string, Task>(tasks.map(t => [t.taskId, t]));

    console.log(`Loaded ${workers.length} workers and ${tasks.length} tasks definitions.`);

    // 3. Load Output Data (Assignments)
    console.log(`Loading Assignments from: ${path.basename(OUTPUT_EXCEL_PATH)}`);
    const outputWorkbook = XLSX.readFile(OUTPUT_EXCEL_PATH);

    const sheetName = "Assignments"; // Ensure this matches generator
    if (!outputWorkbook.Sheets[sheetName]) {
        console.error(`❌ Sheet '${sheetName}' not found in results.xlsx`);
        process.exit(1);
    }

    const rawRows = XLSX.utils.sheet_to_json<any>(outputWorkbook.Sheets[sheetName]);
    // Map Excel Columns to internal structure
    // Generator columns: { Task: 'T1', Worker: 'W1', 'Start Time': '...', 'End Time': '...' }
    // We need to check exact column names from generator. 
    // Usually utils/excelGenerator uses: "Task ID", "Worker ID", "Start Time", "End Time" or similar.
    // Let's inspect raw row first to be sure or just handle common cases.

    const assignments: LoadedAssignment[] = rawRows.map(r => {
        // Correct keys from excelGenerator.ts: TaskId, Worker, Start, End
        return {
            taskId: r['TaskId'] || r['Task ID'] || r['taskId'] || r['Task'], // Fallback to Task (Name) only if ID missing
            workerId: r['Worker'] || r['Worker ID'] || r['workerId'],
            startDate: r['Start'] || r['Start Time'] || r['startDate'],
            endDate: r['End'] || r['End Time'] || r['endDate']
        };
    }).filter(a => a.taskId && a.workerId); // Filter empty

    console.log(`Loaded ${assignments.length} assignments.`);

    // 4. Verification Loop
    console.log("\n--- Running Constraints Validation ---");
    let passCount = 0;
    let failCount = 0;

    // Sort by time for concurrency check logic
    assignments.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Maps for checking
    // Concurrency: Key = TaskId + interval. We need to check overlap.
    // Simple approach: For each assignment, check concurrency at that moment.
    // Or bucket by 30min slots.

    // Let's build a timeline map for checking concurrency accurately
    // Map<TimeSlot, Map<TaskId, count>>
    const timeSlotUsage = new Map<string, Map<string, number>>();
    // Map<TimeSlot, Map<WorkerId, TaskId>>
    const workerAvailabilityMap = new Map<string, Map<string, string>>();

    // Helper to generate 30min slots between start and end
    const getSlots = (start: string, end: string) => {
        const slots: string[] = [];
        let curr = new Date(start).getTime();
        const e = new Date(end).getTime();
        while (curr < e) {
            slots.push(new Date(curr).toISOString());
            curr += 30 * 60 * 1000;
        }
        return slots;
    };

    // Populate usage maps
    for (const a of assignments) {
        const slots = getSlots(a.startDate, a.endDate);
        for (const s of slots) {
            // Worker Usage
            if (!workerAvailabilityMap.has(s)) workerAvailabilityMap.set(s, new Map());
            const wMap = workerAvailabilityMap.get(s)!;

            // Task Usage
            if (!timeSlotUsage.has(s)) timeSlotUsage.set(s, new Map());
            const tMap = timeSlotUsage.get(s)!;

            // Record
            if (wMap.has(a.workerId)) {
                // Determine if double booking (FAIL)
                // We'll mark it here, but actual reporting is per assignment below
            }
            wMap.set(a.workerId, a.taskId);
            tMap.set(a.taskId, (tMap.get(a.taskId) || 0) + 1);
        }
    }

    // Task Completion Tracking for Prerequisites
    // Store earliest start time of every assignment for a task
    // And latest end time? No, prereq means "Task A must be COMPLETE before Task B starts".
    // So Task A's MAX End Time must be <= Task B's MIN Start Time.
    const taskMinStart = new Map<string, number>();
    const taskMaxEnd = new Map<string, number>();

    assignments.forEach(a => {
        const s = new Date(a.startDate).getTime();
        const e = new Date(a.endDate).getTime();
        if (!taskMinStart.has(a.taskId) || s < taskMinStart.get(a.taskId)!) taskMinStart.set(a.taskId, s);
        if (!taskMaxEnd.has(a.taskId) || e > taskMaxEnd.get(a.taskId)!) taskMaxEnd.set(a.taskId, e);
    });

    // Validating each assignment
    assignments.forEach((assign, index) => {
        const errors: string[] = [];
        const task = tasksMap.get(assign.taskId);
        const worker = workersMap.get(assign.workerId);

        if (!task || !worker) {
            console.error(`Unknown Entity: Task=${assign.taskId}, Worker=${assign.workerId}`);
            failCount++;
            return;
        }

        // 1. Skill Check
        if (task.requiredSkills && task.requiredSkills.length > 0) {
            const hasSkill = task.requiredSkills.every(s => worker.skills.includes(s));
            if (!hasSkill) errors.push(`Missing Skills: ${task.requiredSkills.join(', ')}`);
        }

        // 2. Prerequisite Check
        // Check if any prereq is not finished before this assignment starts
        if (task.prerequisiteTaskIds) {
            const assignStart = new Date(assign.startDate).getTime();
            for (const pid of task.prerequisiteTaskIds) {
                const pEnd = taskMaxEnd.get(pid);
                // If pEnd exists, check it. If not exists, Prereq never started!
                if (!pEnd) {
                    errors.push(`Prerequisite ${pid} never started/finished`);
                } else if (pEnd > assignStart) {
                    // Start of this assignment cannot be before end of prereq
                    errors.push(`Prerequisite ${pid} overlaps (Ends at ${new Date(pEnd).toISOString()})`);
                }
            }
        }

        // 3. Min/Max Workers (Check all slots this assignment covers)
        const slots = getSlots(assign.startDate, assign.endDate);
        for (const s of slots) {
            const count = timeSlotUsage.get(s)?.get(assign.taskId) || 0;
            if (task.minWorkers && count < task.minWorkers) {
                errors.push(`MinWorkers Violation at ${s} (Count ${count} < ${task.minWorkers})`);
            }
            if (task.maxWorkers && count > task.maxWorkers) {
                errors.push(`MaxWorkers Violation at ${s} (Count ${count} > ${task.maxWorkers})`);
            }
        }

        // 4. Double Booking (Check if this worker is in another task in these slots)
        // This is tricky iteratively. We can check if `workerAvailabilityMap` has conflicting entries?
        // Actually, we built the map using THESE assignments. So we just check if the map has *Collision*.
        // But map only stores one value.
        // Let's rely on overlap check:
        // Filter other assignments for same worker that overlap time.
        const overlap = assignments.find(other =>
            other !== assign &&
            other.workerId === assign.workerId &&
            new Date(other.startDate) < new Date(assign.endDate) &&
            new Date(other.endDate) > new Date(assign.startDate)
        );
        if (overlap) {
            errors.push(`Double Booked with Task ${overlap.taskId} (${overlap.startDate})`);
        }


        // Report
        if (errors.length > 0) {
            console.log(`❌ FAIL [${assign.workerId} -> ${assign.taskId}]`);
            errors.forEach(e => console.log(`   └─ ${e}`));
            failCount++;
        } else {
            passCount++;
        }
    });

    // ... (previous validation)

    console.log("\n--- 5. Optimization Checks (Soft Constraints) ---");
    let optFailCount = 0;

    // A. Continuity (Minimise Switching)
    // Calculate global average block duration
    const workerAssignments = new Map<string, Array<{ start: number, end: number, taskId: string }>>();
    assignments.forEach(a => {
        if (!workerAssignments.has(a.workerId)) workerAssignments.set(a.workerId, []);
        workerAssignments.get(a.workerId)!.push({
            start: new Date(a.startDate).getTime(),
            end: new Date(a.endDate).getTime(),
            taskId: a.taskId
        });
    });

    let totalBlocks = 0;
    let totalDurationHours = 0;

    workerAssignments.forEach((list, wId) => {
        list.sort((a, b) => a.start - b.start);
        let blocks = 0;
        let lastTask = "";
        list.forEach((a, i) => {
            totalDurationHours += (a.end - a.start) / 36e5;
            // Count blocks: distinct task segments
            if (i === 0 || a.taskId !== lastTask) {
                blocks++;
                lastTask = a.taskId;
            }
        });
        totalBlocks += blocks;
    });

    const avgBlockDuration = totalBlocks > 0 ? totalDurationHours / totalBlocks : 0;
    console.log(`Optimization: Average Contiguous Block Duration = ${avgBlockDuration.toFixed(2)} hrs`);

    // Threshold: User wants "Prefer longer continuous blocks".
    // 1.5h is a reasonable minimum for a factory setting (3x 30min slots).
    if (avgBlockDuration < 1.5) {
        console.warn(`⚠️ Optimization Warning: High Fragmentation. Avg Block < 1.5h (${avgBlockDuration.toFixed(2)}h)`);
        // optFailCount++; // Soft constraint, maybe don't fail process? User said "must be checked". Warnings are checks.
    } else {
        console.log("✅ Optimization: Continuity Good (>1.5h avg)");
    }

    // B. Swarming (Minimise Swarming)
    // Check max concurrency per task
    // We already calculated concurrency in timeSlotUsage (technically, we didn't save task specific max there, let's re-scan)
    // Re-use timeSlotUsage from earlier
    const taskMaxConcurrency = new Map<string, number>();
    timeSlotUsage.forEach((tMap) => {
        tMap.forEach((count, tId) => {
            const curr = taskMaxConcurrency.get(tId) || 0;
            if (count > curr) taskMaxConcurrency.set(tId, count);
        });
    });

    // Check if any task was swarmed "unnecessarily"
    // Heuristic: If task has < 5 hours total estimated labor, but used > 4 workers?
    // Let's just report high concurrency for manual review or warning > 6
    let highSwarmcount = 0;
    taskMaxConcurrency.forEach((max, tId) => {
        if (max > 6) {
            console.warn(`⚠️ Optimization Warning: Task ${tId} heavily swarmed (Max Workers: ${max})`);
            highSwarmcount++;
        }
    });
    if (highSwarmcount === 0) {
        console.log("✅ Optimization: Swarming Levels Acceptable (<= 6 workers/task)");
    }

    console.log("\n--- Validation Summary ---");
    console.log(`Assignments Checked: ${assignments.length}`);
    console.log(`✅ Hard Constraints Passed: ${passCount}`);
    console.log(`❌ Hard Constraints Failed: ${failCount}`);

    if (failCount === 0) {
        console.log("\n🎉 File 'results.xlsx' is VALID (Hard Constraints Met).");
        if (avgBlockDuration < 1.5 || highSwarmcount > 0) {
            console.log("⚠️ Note: Optimizations (Swarming/Continuity) flagged warnings (see above).");
        }
    } else {
        console.error("\n💀 Validation Failed.");
        process.exit(1);
    }
}

validateResults();
