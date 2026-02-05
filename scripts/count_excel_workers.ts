
import * as XLSX from 'xlsx';

const DATA_FILE = 'Vederra Data Loading Developer (1).xlsx';
const workbook = XLSX.readFile(DATA_FILE);

let totalWorkers = 0;
const workerSheets = workbook.SheetNames.filter(n => n.startsWith('Workers'));

console.log(`Found ${workerSheets.length} Worker Sheets.`);

workerSheets.forEach(sheetName => {
    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    let sheetWorkerCount = 0;

    // Find header
    let headerRowIdx = -1;
    for (let i = 0; i < data.length; i++) {
        const cell = data[i][0]?.toString().trim().toLowerCase();
        if (cell === 'first name' || cell === 'first name ') {
            headerRowIdx = i;
            break;
        }
    }

    if (headerRowIdx !== -1) {
        for (let i = headerRowIdx + 1; i < data.length; i++) {
            const row = data[i];
            const name = row[0]?.toString().trim();
            if (name) {
                sheetWorkerCount++;
                // console.log(`  Found: ${name} in ${sheetName}`);
            }
        }
    }

    console.log(`Sheet '${sheetName}': ${sheetWorkerCount} workers`);
    totalWorkers += sheetWorkerCount;
});

console.log(`\nTOTAL Potential Workers in Spreadsheet: ${totalWorkers}`);
