
import * as XLSX from 'xlsx';

const DATA_FILE = 'Vederra Data Loading Developer (1).xlsx';
const workbook = XLSX.readFile(DATA_FILE);

console.log("--- WORKERS SHEET ---");
const wSheet = workbook.Sheets['Workers Structure'];
if (wSheet) {
    const data = XLSX.utils.sheet_to_json(wSheet, { header: 1 });
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
} else {
    console.log("Workers Structure sheet not found");
}

console.log("\n--- TIME STUDY SHEET ---");
const tSheet = workbook.Sheets['TIme Study Data'];
if (tSheet) {
    const data = XLSX.utils.sheet_to_json(tSheet, { header: 1 });
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
} else {
    console.log("TIme Study Data sheet not found");
}
