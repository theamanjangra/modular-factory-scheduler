import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { parseExcelData } from '../src/utils/excelLoader'; // Reuse the project's loader
import { Worker, Task } from '../src/types';

const INPUT_FILE = path.resolve(__dirname, '../sample_simulation 2.xlsx');
const RESULT_FILE = process.argv[2];

if (!RESULT_FILE) {
    console.error("Please provide the path to the plan XLSX file.");
    process.exit(1);
}

async function validate() {
    console.log(`\n🔍 Validating Plan: ${path.basename(RESULT_FILE)}`);
    console.log(`   Against Input: ${path.basename(INPUT_FILE)}\n`);

    // 1. Load Input Data (Source of Truth)
    const inputBuf = fs.readFileSync(INPUT_FILE);
    const inputData = await parseExcelData(inputBuf);
    const tasks = inputData.tasks;
    const workers = inputData.workers;

    console.log(`Loaded Source: ${tasks.length} Tasks, ${workers.length} Workers.`);

    // 2. Load Result Data
    const workbook = XLSX.readFile(RESULT_FILE);
    workbook.SheetNames.forEach(name => {
        console.log(`\n--- SHEET: ${name} ---`);
        const s = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(s, { header: 1 }) as any[][];
        if (rows.length > 0) {
            console.log("Headers?", rows[0]);
            // Search for Start/End in this sheet
            for (let i = 0; i < Math.min(rows.length, 20); i++) {
                if (rows[i] && rows[i].some(c => c && c.toString().trim() === 'Start')) {
                    console.log(`FOUND ASSIGNMENTS TABLE IN SHEET '${name}' AT ROW ${i}`);
                }
            }
        }
    });

    // Fallback: Assume use the sheet with "Start" column
    let targetSheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheetName], { header: 1 }); // Default

    // Better logic: pick the right sheet
    for (const name of workbook.SheetNames) {
        const s = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(s, { header: 1 }) as any[][];
        const hasStart = rows.some(r => r && r.some(c => c && c.toString().trim() === 'Start'));
        if (hasStart) {
            targetSheetName = name;
            break;
        }
    }

    console.log(`\nUSING SHEET: ${targetSheetName}`);
    const sheet = workbook.Sheets[targetSheetName];
    // Re-read rows from target sheet
    const finalRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find Headers
    let headerRowIndex = 0;
    let headers: string[] = [];

    for (let i = 0; i < finalRows.length; i++) {
        const row = finalRows[i] as any[];
        if (row && row.some(c => c && c.toString().trim() === 'Start') && row.some(c => c && c.toString().trim() === 'End')) {
            headerRowIndex = i;
            headers = row;
            console.log(`Found Header at Row ${i}: ${headers.join(', ')}`);
            break;
        }
    }

    const assignments = finalRows.slice(headerRowIndex + 1).map((r: any) => {
        const rowObj: any = {};
        headers.forEach((h, i) => {
            rowObj[h] = r[i];
        });

        // Skip empty rows
        if (!rowObj['Task']) return null;

        return {
            taskName: rowObj['Task'],
            taskId: rowObj['TaskId'],
            workerId: rowObj['Worker'],
            startTime: new Date(rowObj['Start']),
            endTime: new Date(rowObj['End'])
        };
    }).filter(x => x !== null);

    console.log(`Loaded Result: ${assignments.length} assignments.`);

    let errors: string[] = [];
    let warnings: string[] = [];

    // --- Q1: Is this the correct result for the input? (Consistency Check) ---
    const inputTaskIds = new Set(tasks.map(t => t.taskId));
    const resultTaskIds = new Set(assignments.map(a => a.taskId));

    // Check for "Ghost Tasks" in result
    resultTaskIds.forEach(id => {
        if (!inputTaskIds.has(id)) {
            errors.push(`❌ Unknown Task ID in result: ${id} (Not in input file)`);
        }
    });

    // Check for Workers
    const inputWorkerIds = new Set(workers.map(w => w.workerId));
    assignments.forEach((a, i) => {
        if (!inputWorkerIds.has(a.workerId)) {
            errors.push(`❌ Unknown Worker ID in result: ${a.workerId} (Row ${i + 2})`);
        }
    });

    // --- Q2: Are all constraints followed & Tasks Completed? ---

    // Skill & Time Constraints (From previous logic)
    assignments.forEach((a, idx) => {
        const worker = workers.find(w => w.workerId === a.workerId);
        const task = tasks.find(t => t.taskId === a.taskId);
        if (!worker || !task) return; // Already caught above

        // Skill
        if (task.requiredSkills && task.requiredSkills.length > 0) {
            const hasSkill = task.requiredSkills.every(req => worker.skills.includes(req));
            if (!hasSkill) {
                errors.push(`❌ Skill Violation: ${a.workerId} on ${a.taskName} missing [${task.requiredSkills.join(', ')}]`);
            }
        }
    });

    // Availability Check (Time)
    assignments.forEach(a => {
        const h = a.startTime.getUTCHours();
        // Assuming 10h shift: 07:00 to 17:00
        if (h < 7 && h > 0) errors.push(`❌ Time Violation: Starts before 07:00 (${a.startTime.toISOString()})`);
        if (a.endTime.getUTCHours() >= 17 && a.endTime.getUTCMinutes() > 0) errors.push(`❌ Time Violation: Ends after 17:00 (${a.endTime.toISOString()})`);
    });

    // Completion Check
    // Calculate total hours done per task
    const taskProgress = new Map<string, number>();
    assignments.forEach(a => {
        const durationMs = a.endTime.getTime() - a.startTime.getTime();
        const durationHrs = durationMs / (1000 * 60 * 60);
        const curr = taskProgress.get(a.taskId) || 0;
        taskProgress.set(a.taskId, curr + durationHrs);
    });

    console.log("\n--- COMPLETION STATUS ---");
    let completeCount = 0;
    tasks.forEach(t => {
        const done = taskProgress.get(t.taskId) || 0;
        const required = t.estimatedTotalLaborHours || 0;
        const pct = (done / required) * 100;

        if (pct < 99) { // Float tolerance
            errors.push(`❌ INCOMPLETE: ${t.name} (${t.taskId}) - ${pct.toFixed(1)}% (${done.toFixed(2)}/${required} hrs)`);
        } else {
            completeCount++;
        }
    });
    console.log(`Completed: ${completeCount}/${tasks.length} Tasks`);


    // --- Q3: Optimality (Makespan) ---
    // Find the latest end time
    let maxEndTime = 0;
    assignments.forEach(a => {
        if (a.endTime.getTime() > maxEndTime) maxEndTime = a.endTime.getTime();
    });
    const lastFinish = new Date(maxEndTime).toISOString().substr(11, 5); // HH:mm

    console.log(`\n--- OPTIMALITY METRICS ---`);
    console.log(`Shift End:   17:00`);
    console.log(`Actual End:  ${lastFinish} (Makespan)`);

    if (errors.length === 0) {
        console.log("\n✅  PASSED: File is valid, complete, and consistent.");
    } else {
        console.log(`\n❌  FAILED: Found ${errors.length} issues.`);
        errors.forEach(e => console.log(e));
    }
}

validate().catch(console.error);
