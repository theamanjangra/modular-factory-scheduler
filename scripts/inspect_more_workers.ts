
import * as XLSX from 'xlsx';

function inspect() {
    const devFile = 'Vederra Data Loading Developer.xlsx';
    console.log(`Checking ${devFile}...`);
    try {
        const wb = XLSX.readFile(devFile);
        console.log('Sheets:', wb.SheetNames);
    } catch (e) { console.error(e); }

    const masterFile = 'Vederra - Labor Optimization Master.xlsx';
    const wb2 = XLSX.readFile(masterFile);
    const sheet = wb2.Sheets['Cross Functional Skills'];
    if (sheet) {
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        console.log('Master - Cross Functional Skills - Rows 3-10:');
        data.slice(3, 11).forEach(row => console.log(row));
    }
}
inspect();
