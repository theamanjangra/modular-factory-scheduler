
import { PlanningService } from '../src/services/planningService';
import { PlanRequest, Worker, Task } from '../src/types';
import fs from 'fs';
import path from 'path';

// Load real sample data
const sampleDataPath = path.join(__dirname, '../public/sample_data.json');
const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf-8'));

async function verifyEachAssignment() {
    const planningService = new PlanningService();

    const request: PlanRequest = {
        workers: sampleData.workers,
        tasks: sampleData.tasks,
        interval: sampleData.interval,
        useHistorical: false
    };

    console.log("🚀 Running Detailed Verification for Every Assignment...\n");
    const rawSteps = planningService.plan(request);

    const assignments = rawSteps.filter(s => s.type === 'assignment');
    const workersMap = new Map<string, Worker>(sampleData.workers.map((w: Worker) => [w.workerId, w]));
    const tasksMap = new Map<string, Task>(sampleData.tasks.map((t: Task) => [t.taskId, t]));

    // Pre-calculate task timelines for Prereq checks
    const taskStartTimes = new Map<string, number>();
    const taskEndTimes = new Map<string, number>();
    assignments.forEach(a => {
        // Approximate: Task matches assignment ID ? No, assignment links worker-task.
        const s = new Date(a.startDate).getTime();
        const e = new Date(a.endDate).getTime();

        if (!taskStartTimes.has(a.taskId)) taskStartTimes.set(a.taskId, s);
        else taskStartTimes.set(a.taskId, Math.min(taskStartTimes.get(a.taskId)!, s));

        if (!taskEndTimes.has(a.taskId)) taskEndTimes.set(a.taskId, e);
        else taskEndTimes.set(a.taskId, Math.max(taskEndTimes.get(a.taskId)!, e));
    });

    let passCount = 0;
    let failCount = 0;

    // Sort assignments by time for readability
    assignments.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Track worker usage per slot to detect double booking
    const workerSlotUsage = new Map<string, string>(); // Key: "WorkerId|Start|End", Value: TaskId

    // Track task concurrency per slot for Min/Max
    const taskSlotUsage = new Map<string, number>(); // Key: "TaskId|Start", Value: Count

    // First pass: Build concurrency maps
    assignments.forEach(a => {
        const slotKey = `${a.taskId}|${a.startDate}`;
        taskSlotUsage.set(slotKey, (taskSlotUsage.get(slotKey) || 0) + 1);
    });

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
            status = "⚠️ WARN"; // Warn for M1
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
        } else {
            passCount++;
        }
    }

    console.log("\n--- SUMMARY ---");
    console.log(`Total Assignments: ${assignments.length}`);
    console.log(`Valid: ${passCount}`);
    console.log(`Issues: ${failCount} (See above)`);
    console.log("Note: M1 Greedy Algorithm is expected to have some 'Below Min Workers' warnings.");
}

verifyEachAssignment();
