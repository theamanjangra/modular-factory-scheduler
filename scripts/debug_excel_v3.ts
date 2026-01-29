
import * as fs from 'fs';
import * as XLSX from 'xlsx';

const filePath = '/Users/deepanshusingh/Desktop/Getting the One Piece/Builds/modular_factory/planning_results.xlsx';

console.log('Starting Debug Script...');

try {
    if (!fs.existsSync(filePath)) {
        console.error('File NOT found at:', filePath);
        process.exit(1);
    }
    console.log('File found.');

    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });

    console.log('Sheet Names:', workbook.SheetNames);

    // Check for Assignments sheet
    const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('assignment')) || workbook.SheetNames[0];
    console.log('Reading Sheet:', sheetName);

    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    console.log(`Row Count: ${data.length}`);
    if (data.length > 0) {
        console.log('Sample Row 0 keys:', Object.keys(data[0]));
        console.log('Sample Row 0:', JSON.stringify(data[0], null, 2));
    }

    // specific check for shift 2 dates
    console.log('--- Analyzing Dates ---');
    const dates = new Set<string>();

    data.forEach((row, idx) => {
        // try various keys
        const start = row['Start Time'] || row['StartTime'] || row['start'] || row['Start'];
        if (start) {
            // Check if it looks like a date
            let dString = String(start);
            // If strictly numbers (Excel serial date), might need conversion, but usually json converter handles it or gives generic string
            dates.add(dString.split('T')[0]); // Grab just the date part (YYYY-MM-DD)

            if (idx < 3) console.log(`Row ${idx} Start:`, dString);
        }
    });

    console.log('Unique Dates Found:', Array.from(dates));

} catch (err) {
    console.error('Crash:', err);
}
