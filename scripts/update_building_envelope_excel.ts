import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'Building Envelope-simulation.xlsx');

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = 'Tasks';
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
    console.error(`Sheet '${sheetName}' not found in ${filePath}`);
    process.exit(1);
}

// Convert sheet to JSON
const range = XLSX.utils.decode_range(sheet['!ref'] || "A1:Z100");
// Find header row (row with 'TaskName')
const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0 }) as any[][];
let headerRowIndex = -1;
for (let i = 0; i < aoa.length; i++) {
    if (aoa[i] && aoa[i].includes('TaskName')) {
        headerRowIndex = i;
        break;
    }
}

if (headerRowIndex === -1) {
    console.error("Could not find header row with 'TaskName'");
    process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

// Add new columns if they don't exist
const updatedRows = rows.map((row: any) => {
    return {
        ...row,
        'Is non-worker task': row['Is non-worker task'] || 0,
        'Non-worker duration': row['Non-worker duration'] || 0
    };
});

// Create new sheet
const newSheet = XLSX.utils.json_to_sheet(updatedRows);

// Replace sheet in workbook
workbook.Sheets[sheetName] = newSheet;

// Write file
XLSX.writeFile(workbook, filePath);
console.log(`Updated ${filePath} with new columns in '${sheetName}' sheet.`);
