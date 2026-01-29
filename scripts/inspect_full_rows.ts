
import * as XLSX from 'xlsx';

const masterFile = 'Vederra - Labor Optimization Master.xlsx';
const wb = XLSX.readFile(masterFile);
const sheet = wb.Sheets['Time Study List'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

console.log('--- Rows 0 to 15 ---');
data.slice(0, 16).forEach((row, idx) => {
    console.log(`[${idx}]`, JSON.stringify(row));
});
