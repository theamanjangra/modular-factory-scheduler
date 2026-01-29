
const fs = require('fs');
const xlsxModule = require('xlsx');

console.log('--- Debug V4 ---');
console.log('Type of module:', typeof xlsxModule);
console.log('Keys:', Object.keys(xlsxModule));

const XLSX = xlsxModule.default || xlsxModule;
console.log('Has read?', typeof XLSX.read);

const filePath = '/Users/deepanshusingh/Desktop/Getting the One Piece/Builds/modular_factory/planning_results.xlsx';

if (typeof XLSX.read === 'function') {
    try {
        const buf = fs.readFileSync(filePath);
        const workbook = XLSX.read(buf, { type: 'buffer' });
        console.log('SheetNames:', workbook.SheetNames);

        const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('assignment')) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Row count: ${data.length}`);
        if (data.length > 0) {
            console.log('Row 0:', JSON.stringify(data[0]));
        }
    } catch (e) {
        console.log('Error reading:', e.message);
    }
} else {
    console.log('XLSX.read is missing');
}
