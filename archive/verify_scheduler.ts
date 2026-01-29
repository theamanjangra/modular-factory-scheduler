
import { PlanningService } from './src/services/planningService';
import { aggregateSchedule } from './src/utils/scheduleAggregator';
import { Worker, Task } from './src/types';
import fs from 'fs';

function parseCsv(content: string): any[] {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Find header line (starts with TaskName or Name)
    const headerIndex = lines.findIndex(l => l.startsWith('TaskName') || l.startsWith('Name') || l.startsWith('WorkerId'));
    if (headerIndex === -1) return [];

    const headers = lines[headerIndex].split(',').map(h => h.trim());
    const data = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const row = lines[i].split(','); // Simple split, assumes no commas in values
        if (row.length < headers.length) continue;

        const obj: any = {};
        headers.forEach((h, idx) => {
            obj[h] = row[idx]?.trim();
        });
        data.push(obj);
    }
    return data;
}

async function runVerification() {
    console.log("Starting Verification...");

    // 1. Load Data
    const tasksCsv = fs.readFileSync('./Worker-Task algo data - Tasks.csv', 'utf-8');
    const workersCsv = fs.readFileSync('./Worker-Task algo data - Workers.csv', 'utf-8');

    const tasksRaw = parseCsv(tasksCsv);
    const tasks: Task[] = tasksRaw.filter((r: any) => r.TaskName).map((r: any) => ({
        taskId: r.TaskName,
        name: r.TaskName,
        estimatedTotalLaborHours: parseFloat(r.LaborHoursRemaining),
        minWorkers: parseInt(r.MinWorkers) || 1,
        maxWorkers: parseInt(r.MaxWorkers) || 100
    }));

    const workersRaw = parseCsv(workersCsv);
    const workers: Worker[] = workersRaw.filter((r: any) => r.Name).map((r: any) => ({
        workerId: r.Name, // Using Name as ID
        name: r.Name,
        skills: (r.Skills || "").split(',').map((s: string) => s.trim()),
        preferences: {},
        availability: {
            startTime: `2025-05-05T${r.ShiftStart || "08:00"}:00`,
            endTime: `2025-05-05T${r.ShiftEnd || "17:00"}:00`
        }
    }));

    // 2. Run Plan
    const planner = new PlanningService();

    const rawSteps = planner.plan({
        workers,
        tasks,
        interval: {
            startTime: "2025-05-05T07:00:00",
            endTime: "2025-05-05T17:00:00"
        },
        useHistorical: false
    });

    // V2: Aggegate!
    const result = aggregateSchedule(rawSteps);
    // V2 VERIFICATION
    console.log(`Generated ${result.story?.length} total items in Story.`);

    // 1. Check Narrative
    const story = result.story || [];
    const comments = story.filter((s: any) => s.type === 'comment');
    console.log(`Found ${comments.length} narrative comments.`);
    if (comments.length < 2) console.log("WARNING: Less than 2 phases detected.");

    // 2. Check Critical Path (Start Time)
    // Find "Wall Batt insulation" or similar blocker
    const wallBatt = story.find((s: any) => s.taskName === 'Wall Batt insulation' && s.type !== 'comment') as any;
    if (wallBatt) {
        const start = new Date(wallBatt.startTime || wallBatt.startDate).getHours();
        console.log(`CP Task 'Wall Batt' starts at: ${start}:00`);
        if (start > 9) console.log("FAIL: Critical Path started too late!");
    }

    // 3. Swarm & Stickiness V2
    // Use 'story' to extract assignments for checking
    // Assignments don't have explicit type 'assignment' in V2, just comments do.
    const assignments = story.filter((s: any) => s.type !== 'comment');
    console.log(`Found ${assignments.length} assignments.`);

    // Group by Task-Time to check Swarming
    const swarmMap = new Map<string, number>();

    assignments.forEach((a: any) => {
        const key = `${a.taskId}_${a.startTime}`;
        swarmMap.set(key, (swarmMap.get(key) || 0) + 1);
    });

    let maxSwarm = 0;
    let swarmViolationCount = 0;
    swarmMap.forEach((count, key) => {
        if (count > maxSwarm) maxSwarm = count;
        if (count > 4) {
            const taskId = key.split('_')[0];
            const t = tasks.find(t => t.taskId === taskId);
            if (t && t.estimatedTotalLaborHours && t.estimatedTotalLaborHours < 20) {
                swarmViolationCount++;
                console.log(`[Swarm Violation] ${key}: ${count} workers`);
            }
        }
    });

    console.log(`Max Crew Size: ${maxSwarm}`);
    console.log(`Swarm Violations: ${swarmViolationCount}`);

    // Check Continuity
    const workerAssignments = new Map<string, any[]>();
    assignments.forEach((a: any) => {
        if (!workerAssignments.has(a.workerId)) workerAssignments.set(a.workerId, []);
        workerAssignments.get(a.workerId)!.push(a);
    });

    let totalSwitches = 0;
    workerAssignments.forEach((list, wId) => {
        list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        let lastTask = null;
        for (const item of list) {
            if (lastTask && lastTask !== item.taskId) totalSwitches++;
            lastTask = item.taskId;
        }
    });

    console.log(`Total Task Switches: ${totalSwitches}`);

    if (swarmViolationCount === 0 && comments.length > 0) {
        console.log("VERIFICATION PASSED");
    } else {
        console.log("VERIFICATION FAILED");
    }

    // DEBUG: Identify Unfinished Tasks
    const finalResult = result.assignments; // This is the flat list
    // We need to check the final state of each task
    console.log("\n--- UNFINISHED TASKS ANALYSIS ---");
    tasks.forEach(t => {
        const assignments = finalResult.filter((a: any) => a.taskId === t.taskId);

        let hoursDone = 0;
        assignments.forEach((a: any) => {
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();
            hoursDone += (end - start) / (1000 * 60 * 60);
        });

        const progress = (hoursDone / (t.estimatedTotalLaborHours || 1)) * 100;

        if (progress < 99.9) {
            console.log(`❌ [${t.name}] (${t.taskId})`);
            console.log(`   - Progress: ${progress.toFixed(1)}% (${hoursDone.toFixed(2)} / ${t.estimatedTotalLaborHours} hours)`);
            console.log(`   - MinWorkers: ${t.minWorkers}, MaxWorkers: ${t.maxWorkers}`);
            console.log(`   - Prerequisite Tasks: ${t.prerequisiteTaskIds?.join(', ') || 'None'}`);

            // Analyze why?
            if (t.prerequisiteTaskIds?.length) {
                console.log(`   - Constraint: Waiting for dependencies?`);
            } else {
                console.log(`   - Constraint: Resource Starvation or Late Start?`);
            }
        }
    });

}

runVerification();
