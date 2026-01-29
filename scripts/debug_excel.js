
const fs = require('fs');
const XLSX = require('xlsx');

const filePath = '/Users/deepanshusingh/Desktop/Getting the One Piece/Builds/modular_factory/planning_results.xlsx';

function readExcel() {
    try {
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return;
        }

        const buf = fs.readFileSync(filePath);
        const workbook = XLSX.read(buf, { type: 'buffer' });

        console.log('Sheets:', workbook.SheetNames);
        const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('assignment')) || workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} assignments in Excel.`);
        if (data.length > 0) {
            console.log('First row keys:', Object.keys(data[0]));
            console.log('Sample Row:', JSON.stringify(data[0], null, 2));
        }

        let minTime = null;
        let maxTime = null;

        data.forEach(row => {
            const startStr = row['Start Time'] || row['StartTime'];
            const endStr = row['End Time'] || row['EndTime'];
            if (startStr && endStr) {
                const s = new Date(startStr).getTime();
                const e = new Date(endStr).getTime();
                if (!minTime || s < minTime) minTime = s;
                if (!maxTime || e > maxTime) maxTime = e;
            }
        });

        if (minTime) console.log('Min Time:', new Date(minTime).toISOString());
        if (maxTime) console.log('Max Time:', new Date(maxTime).toISOString());

    } catch (e) {
        console.error('Error:', e);
    }
}

readExcel();
