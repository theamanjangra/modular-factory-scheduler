
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const RESULTS_PATH = path.join(__dirname, '../results.xlsx');

interface Assignment {
    taskId: string;
    workerId: string;
    startDate: Date;
    endDate: Date;
    durationHours: number;
}

async function verifyOptimizations() {
    console.log("📊 Analyzing Schedule Optimizations...");

    if (!fs.existsSync(RESULTS_PATH)) {
        console.error("❌ results.xlsx not found.");
        process.exit(1);
    }

    const workbook = XLSX.readFile(RESULTS_PATH);
    const sheet = workbook.Sheets['Assignments'];
    const raw = XLSX.utils.sheet_to_json<any>(sheet);

    // Parse
    const assignments: Assignment[] = raw.map(r => ({
        taskId: r['TaskId'] || r['Task ID'], // Ensure we match generator keys
        workerId: r['Worker'] || r['Worker ID'],
        startDate: new Date(r['Start'] || r['Start Time']),
        endDate: new Date(r['End'] || r['End Time']),
        durationHours: (new Date(r['End'] || r['End Time']).getTime() - new Date(r['Start'] || r['Start Time']).getTime()) / 36e5
    })).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // 1. Continuity Analysis (Task Switching)
    // Group by Worker
    const workerAssignments = new Map<string, Assignment[]>();
    assignments.forEach(a => {
        if (!workerAssignments.has(a.workerId)) workerAssignments.set(a.workerId, []);
        workerAssignments.get(a.workerId)!.push(a);
    });

    let totalSwitches = 0;
    let totalBlocks = 0;
    let totalWorkHours = 0;

    console.log("\n--- 1. Continuity & Stability (Worker Perspective) ---");
    console.log("Worker | Switches | Avg Block (hrs) | Assignments");
    console.log("-------|----------|-----------------|------------");

    workerAssignments.forEach((list, wId) => {
        // Sort by time
        list.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        let switches = 0;
        let lastTask = "";
        let workHours = 0;

        list.forEach((a, idx) => {
            workHours += a.durationHours;
            // A switch counts if task ID changes between consecutive assignments
            // Note: Our assignments are already aggregated chunks?
            // If they are aggregated chunks, then length of list IS the number of blocks (mostly).
            // But let's check explicit interruptions.
            if (idx > 0 && a.startDate.getTime() > list[idx - 1].endDate.getTime()) {
                // Idle gap?
            }
            // Logic: Is this assignment different task than previous?
            if (idx === 0) {
                lastTask = a.taskId;
            } else {
                if (a.taskId !== lastTask) {
                    switches++;
                    lastTask = a.taskId;
                }
            }
        });

        const blocks = list.length;
        const avgBlock = workHours / blocks;

        totalSwitches += switches;
        totalBlocks += blocks;
        totalWorkHours += workHours;

        console.log(`${wId.padEnd(7)}| ${switches.toString().padEnd(9)}| ${avgBlock.toFixed(2).padEnd(16)}| ${blocks}`);
    });

    const avgSwitchesPerWorker = totalSwitches / workerAssignments.size;
    const globalAvgBlock = totalWorkHours / totalBlocks;

    console.log("\nGlobal Metrics:");
    console.log(`- Avg Switches/Worker: ${avgSwitchesPerWorker.toFixed(2)} (Lower is better)`);
    console.log(`- Avg Block Duration:  ${globalAvgBlock.toFixed(2)} hours (Higher is better)`);

    if (globalAvgBlock > 1.5) {
        console.log("✅ Continuity: GOOD (Avg block > 1.5h)");
    } else {
        console.log("⚠️ Continuity: POOR (Avg block < 1.5h) - High Fragmentation");
    }

    // 2. Swarming Analysis
    // Did we throw 10 people at a task just to finish it?
    // Check Max Concurrent Workers per task
    console.log("\n--- 2. Resource Concentration (Swarming) ---");
    const taskConcurrency = new Map<string, number>(); // Max concurrency observed

    // We need time slices again
    // Quick heuristic: Check how many workers touch a task simultaneously
    // Let's iterate slots
    const slots = new Set<string>();
    assignments.forEach(a => {
        // just start times for sampling
        slots.add(a.startDate.toISOString());
    });

    const sortedSlots = Array.from(slots).sort();
    const taskMaxWorkers = new Map<string, number>();

    sortedSlots.forEach(timeIso => {
        const t = new Date(timeIso).getTime();
        const active = assignments.filter(a => a.startDate.getTime() <= t && a.endDate.getTime() > t);

        // Count per task
        const counts = new Map<string, number>();
        active.forEach(a => counts.set(a.taskId, (counts.get(a.taskId) || 0) + 1));

        counts.forEach((count, tId) => {
            const currMax = taskMaxWorkers.get(tId) || 0;
            if (count > currMax) taskMaxWorkers.set(tId, count);
        });
    });

    console.log("Task | Max Concurrent Workers");
    console.log("-----|-----------------------");
    taskMaxWorkers.forEach((max, tId) => {
        console.log(`${tId.padEnd(5)}| ${max}`);
    });

    // 3. Utilization
    // (Total Work Hours) / (Total Capacity)
    // Capacity = (Max End - Min Start) * Worker Count? 
    // Or just sum of all intervals defined in availability?
    // Let's approximate: 9h day (8-17) * workers
    const estimatedCapacity = workerAssignments.size * 9;
    const utilization = (totalWorkHours / estimatedCapacity) * 100;

    console.log("\n--- 3. Utilization ---");
    console.log(`Total Work Hours: ${totalWorkHours.toFixed(1)}`);
    console.log(`Est. Capacity:    ${estimatedCapacity.toFixed(1)} (Assuming 9h day)`);
    console.log(`Utilization:      ${utilization.toFixed(1)}%`);

}

verifyOptimizations();
