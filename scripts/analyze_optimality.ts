
import * as xlsx from 'xlsx';
import * as path from 'path';

// Handle potentially sticky '?' char in filename
const fileName = 'finally_maybe?.xlsx';
const filePath = path.resolve(process.cwd(), fileName);

console.log(`Analyzing file: ${fileName}`);

try {
    const workbook = xlsx.readFile(filePath);

    // 1. Gather Assignments
    let assignments: any[] = [];
    ['Shift 1 Assignments', 'Assignments'].forEach(name => {
        if (workbook.SheetNames.includes(name)) {
            assignments = assignments.concat(xlsx.utils.sheet_to_json(workbook.Sheets[name]));
        }
    });

    console.log(`Total Assignments Found: ${assignments.length}`);
    if (assignments.length === 0) {
        console.log("No assignments found. Aborting.");
        process.exit(1);
    }

    // 2. Gather Idle Time
    let idleRows: any[] = [];
    if (workbook.SheetNames.includes('Idle Workers')) {
        idleRows = xlsx.utils.sheet_to_json(workbook.Sheets['Idle Workers']);
    }

    // 3. Global Stats
    let minTime = Number.POSITIVE_INFINITY;
    let maxTime = Number.NEGATIVE_INFINITY;
    const workerSet = new Set<string>();

    assignments.forEach((r: any) => {
        const s = new Date(r.Start).getTime();
        const e = new Date(r.End).getTime();
        if (s < minTime) minTime = s;
        if (e > maxTime) maxTime = e;
        if (r.Worker && r.Worker !== 'N/A') workerSet.add(r.Worker);
    });

    const shiftDurationHrs = (maxTime - minTime) / (1000 * 60 * 60);
    const totalPotentialManHours = workerSet.size * shiftDurationHrs;

    let totalAssignedHours = 0;
    assignments.forEach((r: any) => {
        if (r.DurationHrs) totalAssignedHours += parseFloat(r.DurationHrs);
    });

    console.log(`\n=== GLOBAL STATS ===`);
    console.log(`Shift Window: ${new Date(minTime).toISOString()} - ${new Date(maxTime).toISOString()}`);
    console.log(`Duration: ${shiftDurationHrs.toFixed(2)} hours`);
    console.log(`Workers: ${workerSet.size}`);
    console.log(`Total Potential Capacity: ${totalPotentialManHours.toFixed(2)} man-hours`);
    console.log(`Total Assigned Work: ${totalAssignedHours.toFixed(2)} man-hours`);
    console.log(`Overall Utilization: ${((totalAssignedHours / totalPotentialManHours) * 100).toFixed(1)}%`);

    // 4. Identify Idle Gaps
    console.log(`\n=== IDLE ANALYSIS ===`);
    console.log(`Total Idle Blocks: ${idleRows.length}`);

    // Filter for "Significant" idle time (e.g. > 30 mins)
    const significantIdle = idleRows.filter((r: any) => parseFloat(r.DurationHrs) > 0.5);
    console.log(`Significant Idle Blocks (>30m): ${significantIdle.length}`);

    // Group by worker
    const workerIdleMap = new Map<string, number>();
    idleRows.forEach((r: any) => {
        const w = r.Worker;
        const dur = parseFloat(r.DurationHrs);
        workerIdleMap.set(w, (workerIdleMap.get(w) || 0) + dur);
    });

    const sortedWorkers = Array.from(workerIdleMap.entries()).sort((a, b) => b[1] - a[1]);

    if (sortedWorkers.length > 0) {
        console.log(`Top 5 Idlers:`);
        sortedWorkers.slice(0, 5).forEach(([w, h]) => console.log(`  - ${w}: ${h.toFixed(2)} hours idle`));

        // Detailed check for the top idler
        const topIdler = sortedWorkers[0][0];
        console.log(`\nDetailed timeline for ${topIdler}:`);

        const topIdleRows = idleRows.filter((r: any) => r.Worker === topIdler);
        topIdleRows.forEach((r: any) => {
            console.log(`  SHIFT IDLE: ${r.Start} -> ${r.End} (${r.DurationHrs}h)`);

            // What else was happening?
            const midPoint = new Date(r.Start).getTime() + (new Date(r.End).getTime() - new Date(r.Start).getTime()) / 2;

            // Find active tasks at midpoint
            const activeTasks = assignments.filter((a: any) => {
                const s = new Date(a.Start).getTime();
                const e = new Date(a.End).getTime();
                return s <= midPoint && e >= midPoint;
            });

            if (activeTasks.length === 0) {
                console.log(`    -> NO TASKS ACTIVE SYSTEM-WIDE (Gap in schedule?)`);
            } else {
                console.log(`    -> ${activeTasks.length} tasks active:`);
                activeTasks.forEach((t: any) => {
                    const isNonWorker = t.Task.toLowerCase().includes('dry') || t.Task.toLowerCase().includes('cure') || t.Worker === 'N/A';
                    console.log(`       * ${t.Task} [${t.Start} - ${t.End}] Worker: ${t.Worker} ${isNonWorker ? '(NON-WORKER)' : ''}`);
                });
            }
        });
    }

} catch (error) {
    console.error("Error reading file:", error);
}
