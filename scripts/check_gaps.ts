
import * as xlsx from 'xlsx';
import * as path from 'path';

const filePath = path.resolve(process.cwd(), '5_min_time_step.xlsx');

try {
    const workbook = xlsx.readFile(filePath);

    const idleSheetName = 'Idle Workers';
    let idleWindows: any[] = [];
    if (workbook.SheetNames.includes(idleSheetName)) {
        idleWindows = xlsx.utils.sheet_to_json(workbook.Sheets[idleSheetName]);
    }

    const assignmentSheets = workbook.SheetNames.filter(n => n.includes('Assignments'));
    let assignments: any[] = [];
    assignmentSheets.forEach(name => {
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[name]);
        assignments = assignments.concat(data);
    });

    const targetWorkers = ['w_22', 'w_19'];

    targetWorkers.forEach(targetWorker => {
        console.log(`\n\n=== Detailed Timeline for ${targetWorker} ===`);

        const workEvents = assignments.filter((r: any) => r.Worker === targetWorker).map((r: any) => ({
            type: 'Work',
            task: r.Task,
            start: new Date(r.Start),
            end: new Date(r.End)
        }));
        const idleEvents = idleWindows.filter((r: any) => r.Worker === targetWorker).map((r: any) => ({
            type: 'Idle',
            task: 'Idle',
            start: new Date(r.Start),
            end: new Date(r.End)
        }));

        const timeline = [...workEvents, ...idleEvents].sort((a, b) => a.start.getTime() - b.start.getTime());

        timeline.forEach(e => {
            // Use UTC to match Excel raw strings "Time as it is"
            // Start: "2026-01-21T07:00:00.000Z" -> "07:00:00"
            const s = e.start.toISOString().substring(11, 19);
            const end = e.end.toISOString().substring(11, 19);
            console.log(`[${s} - ${end}] ${e.type}: ${e.task}`);
        });

        const significantIdle = idleEvents.find(e => (e.end.getTime() - e.start.getTime()) > 10 * 60 * 1000);

        if (significantIdle) {
            const s = significantIdle.start.toISOString().substring(11, 19);
            const end = significantIdle.end.toISOString().substring(11, 19);
            console.log(`\n--- System Snapshot during Idle: ${s} - ${end} ---`);

            const concurrentWork = assignments.filter((r: any) => {
                const start = new Date(r.Start);
                const finish = new Date(r.End);
                return start < significantIdle.end && finish > significantIdle.start;
            });

            const taskStats = new Map<string, number>();
            concurrentWork.forEach((r: any) => {
                taskStats.set(r.Task, (taskStats.get(r.Task) || 0) + 1);
            });

            console.log("Tasks active during this time:");
            if (taskStats.size === 0) {
                console.log("  (No active tasks found)");
            } else {
                taskStats.forEach((count, taskName) => {
                    console.log(`  - ${taskName}: ${count} workers assigned`);
                });
            }
        }
    });

} catch (error) {
    console.error("Error:", error);
}
