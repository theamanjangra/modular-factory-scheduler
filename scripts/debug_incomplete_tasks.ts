
import { PlanningService } from '../src/services/planningService';
import { parseExcelData } from '../src/utils/excelLoader';
import { aggregateSchedule } from '../src/utils/scheduleAggregator';
import fs from 'fs';
import path from 'path';

async function debugIncomplete() {
    console.log("🔍 Starting Debug Analysis for 'sample_simulation 2.xlsx'...");

    const filePath = path.resolve(__dirname, '../sample_simulation 2.xlsx');
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }

    const buffer = fs.readFileSync(filePath);
    const { workers, tasks } = parseExcelData(buffer);

    console.log(`Loaded ${workers.length} workers and ${tasks.length} tasks.`);

    const planner = new PlanningService();
    const rawSteps = planner.plan({
        workers,
        tasks,
        interval: {
            startTime: "2024-01-01T07:00:00Z",
            endTime: "2024-01-01T17:00:00Z"
        },
        useHistorical: false
    });

    const result = aggregateSchedule(rawSteps);

    // Analyze Completion
    console.log("\n--- TASK COMPLETION REPORT ---");
    tasks.forEach(t => {
        const assignments = result.assignments.filter(a => a.taskId === t.taskId);
        let hoursDone = 0;
        assignments.forEach(a => {
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();
            hoursDone += (end - start) / (1000 * 60 * 60);
        });

        const progress = (hoursDone / (t.estimatedTotalLaborHours || 1)) * 100;

        if (progress < 99.9) {
            console.log(`⚠️  INCOMPLETE: [${t.name}]`);
            console.log(`    Progress: ${progress.toFixed(1)}% (${hoursDone.toFixed(2)} / ${t.estimatedTotalLaborHours} hrs)`);
            console.log(`    Workers: Min ${t.minWorkers}, Max ${t.maxWorkers}`);
            console.log(`    Prerequisites: ${t.prerequisiteTaskIds?.join(', ') || 'None'}`);


            console.log(`    Assignments:`);
            assignments.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).forEach(a => {
                const s = new Date(a.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                const e = new Date(a.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                console.log(`      - ${s} to ${e} (${a.workerId})`);
            });

            // Debug Availability for this task
            // Check if it was blocked by prerequisites?
            // (Only useful if we had time trace, but simplified check:)
            const prereqs = t.prerequisiteTaskIds || [];
            if (prereqs.length > 0) {
                console.log(`    Dependency Check:`);
                prereqs.forEach(pid => {
                    // Check if prereq finished?
                    // Need access to simulation state, but we can verify from output
                    const pAssignments = result.assignments.filter(a => a.taskId === pid);
                    // Calculate end time
                    // ...
                });
            }
        }
    });

    console.log("\n--- BAFFELS INVESTIGATION (14:30) ---");
    // 1. Check Skills
    const w11 = workers.find(w => w.workerId === 'w_11');
    const w14 = workers.find(w => w.workerId === 'w_14');
    const baffels = tasks.find(t => t.name && t.name.toLowerCase().includes('baffels'));

    if (w11 && w14 && baffels) {
        console.log(`Baffels Required Skills: ${baffels.requiredSkills?.join(', ')}`);
        console.log(`w_11 Skills: ${w11.skills?.join(', ')}`);
        console.log(`w_14 Skills: ${w14.skills?.join(', ')}`);

        // 2. Check w11/w14 Schedule
        console.log(`\nSchedule for w_11:`);
        result.assignments.filter(a => a.workerId === 'w_11').sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).forEach(a => {
            const s = new Date(a.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            const e = new Date(a.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            console.log(`  - ${s} to ${e}: ${a.taskName}`);
        });

        console.log(`\nSchedule for w_14:`);
        result.assignments.filter(a => a.workerId === 'w_14').sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).forEach(a => {
            const s = new Date(a.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            const e = new Date(a.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            console.log(`  - ${s} to ${e}: ${a.taskName}`);
        });

        // 3. When was Baffels Ready?
        // It relies on t_3 (Ceiling Rim)
        const t3Assignments = result.assignments.filter(a => a.taskId === 't_3');
        if (t3Assignments.length > 0) {
            const lastEnd = t3Assignments.reduce((max, a) => new Date(a.endDate).getTime() > max ? new Date(a.endDate).getTime() : max, 0);
            const readyTime = new Date(lastEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
            console.log(`\nPrerequisite (Ceiling Rim) finished at: ${readyTime}`);
        }
    }

    // Explicit Check for Ceiling Rim (t_3)
    console.log("\n--- BOTTLENECK ANALYSIS: Ceiling Rim (t_3) ---");
    const ceilingRim = tasks.find(t => t.name && t.name.toLowerCase().includes('ceiling rim'));
    const rimAssignments = result.assignments.filter(a => a.taskId === 't_3');

    if (ceilingRim) {
        console.log(`Required Skills: ${ceilingRim.requiredSkills?.join(', ')}`);
        console.log(`Min/Max Workers: ${ceilingRim.minWorkers} / ${ceilingRim.maxWorkers}`);
        console.log(`Assigned Count: ${new Set(rimAssignments.map(a => a.workerId)).size} workers`);

        // Who could have helped?
        const capableWorkers = workers.filter(w => {
            const hasSkill = !ceilingRim.requiredSkills?.length || ceilingRim.requiredSkills.every(req => w.skills?.includes(req));
            return hasSkill;
        });
        console.log(`Capable Workers Total: ${capableWorkers.length}`);
        console.log(`Capable Worker IDs: ${capableWorkers.map(w => w.workerId).join(', ')}`);
    }

    console.log("\n--- TIMING ---");
    rimAssignments.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).forEach(a => {
        const s = new Date(a.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        const e = new Date(a.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        console.log(`  - ${s} to ${e} (${a.workerId})`);
    });
}

debugIncomplete();
