
import * as XLSX from 'xlsx';

const DATA_FILE = 'Vederra Data Loading Developer (1).xlsx';
const workbook = XLSX.readFile(DATA_FILE);
const sheet = workbook.Sheets['SKILLS'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Sheet Names:", workbook.SheetNames);

const sheetName = 'Module attributes';
if (sheetName) {
    console.log(`--- SHEET: ${sheetName} ---`);
    const s = workbook.Sheets[sheetName];
    const d = XLSX.utils.sheet_to_json(s, { header: 1 });
    console.log(JSON.stringify(d.slice(0, 10), null, 2));
} else {
    console.log("No sheet found matching 'SKILL'");
}
