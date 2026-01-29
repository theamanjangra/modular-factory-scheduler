
import { PlanningService } from '../src/services/planningService';
import { PlanRequest, Worker, Task } from '../src/types';
import { parseExcelData } from '../src/utils/excelLoader';
import fs from 'fs';
import path from 'path';

// Load User provided Excel file
// Note: User said "sample_simulation 2.xlsx"
const excelPath = path.join(__dirname, '../sample_simulation 2.xlsx');

async function verifyExcelSimulation() {
    if (!fs.existsSync(excelPath)) {
        console.error(`❌ File not found: ${excelPath}`);
        process.exit(1);
    }

    console.log(`🚀 Loading Excel: ${excelPath}`);
    const buffer = fs.readFileSync(excelPath);
    const { workers, tasks } = parseExcelData(buffer);

    console.log(`Loaded ${workers.length} workers and ${tasks.length} tasks.`);

    const request: PlanRequest = {
        workers,
        tasks,
        interval: {
            startTime: "2024-01-01T08:00:00Z", // Default 8am
            endTime: "2024-01-01T17:00:00Z"   // Default 5pm
        },
        useHistorical: false
    };

    console.log("🚀 Running Planner...");
    const planningService = new PlanningService();
    const rawSteps = planningService.plan(request);

    console.log("🚀 Verifying Assignments...\n");

    const assignments = rawSteps.filter(s => s.type === 'assignment');
    const workersMap = new Map<string, Worker>(workers.map(w => [w.workerId, w]));
    const tasksMap = new Map<string, Task>(tasks.map(t => [t.taskId, t]));

    // Pre-calculate task timelines for Prereq checks
    const taskStartTimes = new Map<string, number>();
    const taskEndTimes = new Map<string, number>(); // Using end of assignment as proxy for progress, though heuristic
    // Note: In detailed verification, we really should track "completion" but strictly:
    // A prereq is satisfied if it is marked complete in simulation state. 
    // Here we can just check if prereq task assignments have finished BEFORE current task starts.
    // However, PlanService guarantees this. We will verify start times.

    // Sort assignments
    assignments.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    assignments.forEach(a => {
        const e = new Date(a.endDate).getTime();
        if (!taskEndTimes.has(a.taskId)) taskEndTimes.set(a.taskId, e);
        else taskEndTimes.set(a.taskId, Math.max(taskEndTimes.get(a.taskId)!, e));
    });

    // Track usage
    const workerSlotUsage = new Map<string, string>();
    const taskSlotUsage = new Map<string, number>();

    // Concurrency build
    assignments.forEach(a => {
        const slotKey = `${a.taskId}|${a.startDate}`;
        taskSlotUsage.set(slotKey, (taskSlotUsage.get(slotKey) || 0) + 1);
    });

    let passCount = 0;
    let failCount = 0;
    let warnCount = 0;

    for (const assign of assignments) {
        const worker = workersMap.get(assign.workerId)!;
        const task = tasksMap.get(assign.taskId)!;
        const timeSlot = `${assign.startDate.substr(11, 5)}-${assign.endDate.substr(11, 5)}`;

        let status = "✅ PASS";
        let issues: string[] = [];

        // 1. Skill Check
        const hasSkill = task.requiredSkills ? task.requiredSkills.every(s => worker.skills.includes(s)) : true;
        if (!hasSkill) {
            status = "❌ FAIL";
            issues.push(`Missing Skills: ${task.requiredSkills}`);
        }

        // 2. Double Booking Check
        const slotKey = `${worker.workerId}|${assign.startDate}`;
        if (workerSlotUsage.has(slotKey)) {
            status = "❌ FAIL";
            issues.push(`Double Booked with ${workerSlotUsage.get(slotKey)}`);
        }
        const workerName = worker.name || 'Unknown Worker';
        const taskName = task.name || 'Unknown Task';
        workerSlotUsage.set(slotKey, taskName);

        // 3. Prerequisite Check
        if (task.prerequisiteTaskIds) {
            for (const pid of task.prerequisiteTaskIds) {
                const pEnd = taskEndTimes.get(pid);
                const currentStart = new Date(assign.startDate).getTime();
                // Strict: Current Start must be >= Prereq End
                if (!pEnd || currentStart < pEnd) {
                    status = "❌ FAIL";
                    issues.push(`Prereq ${pid} not done (End: ${pEnd ? new Date(pEnd).toISOString().substr(11, 8) : 'Never'})`);
                }
            }
        }

        // 4. Min/Max Check
        const concurrency = taskSlotUsage.get(`${assign.taskId}|${assign.startDate}`) || 0;
        if (task.minWorkers && concurrency < task.minWorkers) {
            status = "❌ FAIL"; // STRICT NOW (M2 Logic)
            issues.push(`Below Min Workers (${concurrency} < ${task.minWorkers})`);
        }
        if (task.maxWorkers && concurrency > task.maxWorkers) {
            status = "❌ FAIL";
            issues.push(`Above Max Workers (${concurrency} > ${task.maxWorkers})`);
        }

        console.log(`[${timeSlot}] ${workerName.padEnd(20)} -> ${taskName.padEnd(30)} | ${status}`);
        if (issues.length > 0) {
            issues.forEach(i => console.log(`   └─ ${i}`));
            if (status.includes("FAIL")) failCount++;
            if (status.includes("WARN")) warnCount++;
        } else {
            passCount++;
        }
    }

    console.log("\n--- SUMMARY (Excel Simulation) ---");
    console.log(`Assignments: ${assignments.length}`);
    console.log(`Valid: ${passCount}`);
    console.log(`Warnings: ${warnCount}`);
    console.log(`Failures: ${failCount}`);

    if (failCount > 0) process.exit(1);
}

verifyExcelSimulation();
