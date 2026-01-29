
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'delivery_day_results.xlsx');

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
console.log('Sheets found:', workbook.SheetNames);

const targetTasks = ['Exterior Fire Wall Drywall', 'Fire Tape Fire Walls', 'Exterior OSB / Window Nailers'];

// Helper to search in a sheet
function searchInSheet(sheetName: string) {
    if (!workbook.Sheets[sheetName]) {
        console.log(`Sheet "${sheetName}" not found.`);
        return;
    }
    console.log(`\n--- Searching in "${sheetName}" ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    targetTasks.forEach(taskName => {
        const found = data.filter((row: any) => {
            return Object.values(row).some(val =>
                String(val).toLowerCase().includes(taskName.toLowerCase())
            );
        });

        if (found.length > 0) {
            console.log(`Found "${taskName}":`);
            found.forEach(row => console.log(JSON.stringify(row, null, 2)));
        } else {
            console.log(`"${taskName}" NOT FOUND in ${sheetName}.`);
        }
    });
}

// Dump all assignments to see who is busy
function dumpAllAssignments(sheetName: string) {
    if (!workbook.Sheets[sheetName]) return;
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`\n--- All Assignments in "${sheetName}" ---`);
    data.forEach((row: any) => {
        // Only print relevant columns to save space
        console.log(`Worker: ${row.Worker}, Task: ${row.Task}, Start: ${row.Start}, End: ${row.End}`);
    });
}

dumpAllAssignments('Shift 1 Assignments');

function dumpTasksSheet() {
    const sheetName = 'Tasks';
    if (!workbook.Sheets[sheetName]) {
        console.log("Tasks sheet not found!");
        return;
    }
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`\n--- Tasks Definitions ---`);
    data.forEach((row: any) => {
        if (row.TaskName === 'Exterior Foam Board Insulation ' || row.TaskName === 'Exterior Foam Board Insulation' || row.TaskName === 'Fire Tape Fire Walls' || row.TaskName === 'Fire Tape Fire Walls ') {
            console.log(`Name: '${row.TaskName}', Prereq: '${row.PrerequisiteTask}'`);
        }
    });
}
dumpTasksSheet();
