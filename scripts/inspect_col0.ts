
import * as XLSX from 'xlsx';

const masterFile = 'Vederra - Labor Optimization Master.xlsx';
const wb = XLSX.readFile(masterFile);
const sheet = wb.Sheets['Time Study List'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

console.log('First 20 rows of Column 0:');
data.slice(0, 20).forEach((row, idx) => {
    console.log(`Row ${idx}: ${row[0]}`);
});
