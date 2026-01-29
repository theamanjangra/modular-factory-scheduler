
import * as XLSX from 'xlsx';

const masterFile = 'Vederra - Labor Optimization Master.xlsx';
const wb = XLSX.readFile(masterFile);
const sheet = wb.Sheets['Cross Functional Skills'];
if (sheet) {
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    console.log('Headers:', data[0]);
    if (data.length > 1) console.log('Row 1:', data[1]);
    if (data.length > 2) console.log('Row 2:', data[2]);
}
