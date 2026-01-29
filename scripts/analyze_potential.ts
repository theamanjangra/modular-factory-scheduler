
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const RESULT_FILE = path.resolve(__dirname, '../better_than_best_results.xlsx');

async function analyze() {
    console.log(`\n🔍 Analyzing Potential for: ${path.basename(RESULT_FILE)}\n`);

    const workbook = XLSX.readFile(RESULT_FILE);

    // Find Assignments Sheet
    let sheetName = "";
    for (const name of workbook.SheetNames) {
        const s = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(s, { header: 1 }) as any[][];
        if (rows.length > 0 && rows[0].includes('Start') && rows[0].includes('Worker')) {
            sheetName = name;
            break;
        }
    }

    if (!sheetName) { console.error("Could not find Assignments sheet"); process.exit(1); }

    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const assignments = rawData.map((row: any) => ({
        taskName: row['Task'],
        workerId: row['Worker'],
        start: new Date(row['Start']).getTime(),
        end: new Date(row['End']).getTime()
    }));

    // 1. Worker Utilization
    const workerHours = new Map<string, number>();
    const shiftStart = 1704092400000; // 07:00 Z (approx, from file knowledge)
    const shiftEnd = 1704128400000;   // 17:00 Z
    const shiftDuration = (shiftEnd - shiftStart) / 1000 / 60 / 60; // 10 hours

    // Detect actual start/end from data to be safe
    let minStart = Infinity;
    let maxEnd = 0;

    assignments.forEach(a => {
        if (a.start < minStart) minStart = a.start;
        if (a.end > maxEnd) maxEnd = a.end;

        const duration = (a.end - a.start) / 1000 / 60 / 60;
        workerHours.set(a.workerId, (workerHours.get(a.workerId) || 0) + duration);
    });

    console.log("--- WORKER UTILIZATION ---");
    const workers = Array.from(workerHours.entries()).sort((a, b) => a[1] - b[1]); // Ascending
    let lowUtilWorkers: string[] = [];

    workers.forEach(([wid, hrs]) => {
        const pct = (hrs / 10) * 100;
        console.log(`${wid}: ${hrs.toFixed(2)} hrs (${pct.toFixed(0)}%)`);
        if (hrs < 4) lowUtilWorkers.push(wid);
    });

    if (lowUtilWorkers.length > 0) {
        console.log(`\n💡 OPPORTUNITY: ${lowUtilWorkers.length} workers have low utilization (<40%).`);
        console.log(`   Candidates for removal: ${lowUtilWorkers.join(', ')}`);
    } else {
        console.log("\n✅  All workers seem busy. Hard to reduce headcount.");
    }

    // 2. Critical Path / Makespan Analysis
    console.log("\n--- TIMING ANALYSIS ---");
    const actualDuration = (maxEnd - minStart) / 1000 / 60 / 60;
    console.log(`Current Makespan: ${actualDuration.toFixed(2)} hours (Ends at 17:00 approx)`);

    const targetEnd = maxEnd - (30 * 60 * 1000); // 16:30

    // Check "Crunch Density"
    // Divide day into 30 min blocks, count active workers
    console.log("\n--- CONCURRENCY HEATMAP ---");
    let maxConcurrent = 0;
    for (let t = minStart; t < maxEnd; t += 1800000) { // 30 mins
        let active = 0;
        assignments.forEach(a => {
            if (a.start <= t && a.end > t) active++;
        });
        const timeStr = new Date(t).toISOString().substr(11, 5);
        console.log(`${timeStr}: ${active} workers`);
        if (active > maxConcurrent) maxConcurrent = active;
    }

    console.log(`\nPeak Concurrency: ${maxConcurrent} workers.`);

    if (maxConcurrent < 16) {
        console.log(`💡 OPPORTUNITY: Peak usage is ${maxConcurrent}, but you have 16 workers.`);
        console.log(`   You theoretically only need ${maxConcurrent} people to maintain this exact schedule.`);
    }

    // Conclusion for user
    console.log("\n--- CONCLUSION ---");
    if (lowUtilWorkers.length > 0 || maxConcurrent < 16) {
        console.log("YES: Fewer people is possible.");
    } else {
        console.log("NO: Fewer people is unlikely without delaying tasks.");
    }

    // 4:30 finish?
    // Crude check: Is the last 30 mins heavily utilized?
    const last30Start = maxEnd - 1800000;
    let lateWorkers = 0;
    assignments.forEach(a => {
        if (a.end > last30Start) lateWorkers++;
    });

    if (lateWorkers > 0) {
        console.log(`Finishing at 16:30 is HARD. ${lateWorkers} tasks occupy the last 30 mins.`);
        // Could we move them earlier? Check 16:00-16:30 utilization
        // This requires complex recalculation, but heuristics help.
    } else {
        console.log("Finishing at 16:30 might be possible (Idle at end).");
    }
}

analyze().catch(console.error);
