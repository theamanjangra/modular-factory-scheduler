
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve('5_min_idle.xlsx');

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetNames = workbook.SheetNames;
console.log('Sheets:', sheetNames);

// Check "Idle Workers" sheet
if (sheetNames.includes('Idle Workers')) {
    console.log('\n--- IDLE WORKERS SHEET ---');
    const sheet = workbook.Sheets['Idle Workers'];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Print ALL idle rows since there are few
    console.log(`\nTotal Idle Rows: ${data.length}`);
    data.forEach((row: any) => console.log(JSON.stringify(row)));
}

// Check "Assignments" sheet or similar
['Shift 1 Assignments', 'Shift 2 Assignments', 'Assignments'].forEach(sheetName => {
    if (sheetNames.includes(sheetName)) {
        console.log(`\n--- ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Check for "IDLE" tasks
        const idleAssignments = data.filter((r: any) =>
            (r['Task'] && r['Task'].toString().toUpperCase().includes('IDLE')) ||
            (r['TaskId'] && r['TaskId'].toString().toUpperCase().includes('IDLE'))
        );

        if (idleAssignments.length > 0) {
            console.log(`FOUND ${idleAssignments.length} ASSIGNMENTS LABELLED 'IDLE':`);
            idleAssignments.slice(0, 20).forEach(r => console.log(JSON.stringify(r)));
        } else {
            console.log("No assignments labelled 'IDLE' found.");
        }

        // Also dump first few regular assignments to check continuity
        console.log("First 5 rows:");
        data.slice(0, 5).forEach(r => console.log(JSON.stringify(r)));
    }
});
