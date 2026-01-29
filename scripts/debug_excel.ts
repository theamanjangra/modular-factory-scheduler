
import * as fs from 'fs';
import * as XLSX from 'xlsx';

const filePath = '/Users/deepanshusingh/Desktop/Getting the One Piece/Builds/modular_factory/planning_results.xlsx';

function readExcel() {
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });

    // Assuming 'Assignments' sheet exists
    const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('assignment'));
    if (!sheetName) {
        console.error('Assignments sheet not found. Sheets:', workbook.SheetNames);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${data.length} assignments in Excel.`);

    // Group by Date/Shift to see distribution
    const byDate: Record<string, number> = {};
    const shifts: Record<string, number> = {};

    data.forEach((row: any) => {
        // Log a few sample rows to understand structure
        // Expected columns: Worker ID, Task ID, Start Time, End Time...
    });

    // Print first 5 rows
    console.log('Sample Data (First 5):');
    console.log(JSON.stringify(data.slice(0, 5), null, 2));

    // Analyze time ranges
    let minTime = new Date(8640000000000000).getTime();
    let maxTime = new Date(-8640000000000000).getTime();

    data.forEach((row: any) => {
        const start = new Date(row['Start Time'] || row['StartTime'] || row['start']);
        const end = new Date(row['End Time'] || row['EndTime'] || row['end']);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            if (start.getTime() < minTime) minTime = start.getTime();
            if (end.getTime() > maxTime) maxTime = end.getTime();
        }
    });

    console.log('Time Range in Excel:');
    console.log('Min:', new Date(minTime).toISOString());
    console.log('Max:', new Date(maxTime).toISOString());

    // Check specifically for "Shift 2" timing (after 13:00 usually)
    const lateTasks = data.filter((row: any) => {
        const start = new Date(row['Start Time'] || row['StartTime']);
        const h = start.getUTCHours();
        // Note: checking UTC hours might be tricky without knowing input timezone, 
        // but let's just see the distribution
        return true;
    });
}

readExcel();
