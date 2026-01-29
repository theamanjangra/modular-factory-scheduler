
const fs = require('fs');
const XLSX = require('xlsx');

const filePath = '/Users/deepanshusingh/Desktop/Getting the One Piece/Builds/modular_factory/planning_results.xlsx';

console.log('XLSX Type:', typeof XLSX);
console.log('XLSX Keys:', Object.keys(XLSX));

function readExcel() {
    try {
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return;
        }

        const buf = fs.readFileSync(filePath);
        // Use read not readFile for buffer
        const workbook = XLSX.read(buf, { type: 'buffer' });

        console.log('Sheets:', workbook.SheetNames);
        // Look for any sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} rows in first sheet.`);
        if (data.length > 0) {
            console.log('Sample Row:', JSON.stringify(data[0]));
        }

        // Count assignments per day/hour
        const distribution = {};

        data.forEach(row => {
            const startStr = row['Start Time'] || row['StartTime'];
            if (startStr) {
                const date = startStr.split('T')[0];
                const hour = new Date(startStr).getHours();
                const key = `${date} ${hour}:00`;
                distribution[key] = (distribution[key] || 0) + 1;
            }
        });

        console.log('Task Distribution:', distribution);

    } catch (e) {
        console.error('Error:', e);
    }
}

readExcel();
