
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const files = [
    'Vederra Data Loading Developer (1).xlsx',
    'Vederra Data Model (1).xlsx'
];

files.forEach(filename => {
    const filePath = path.resolve(filename);
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filename}`);
        return;
    }

    console.log(`\n📂 READING: ${filename}`);
    const workbook = XLSX.readFile(filePath);

    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- SHEET: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

        // Print first 20 rows to avoid spamming
        console.log(JSON.stringify(data.slice(0, 20), null, 2));
    });
});
