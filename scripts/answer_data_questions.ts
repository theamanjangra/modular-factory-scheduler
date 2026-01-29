
import * as XLSX from 'xlsx';

function analyze() {
    // 1. Station Mapping
    console.log('--- Question 1: Station Mapping ---');
    const devFile = 'Vederra Data Loading Developer.xlsx';
    try {
        const wb = XLSX.readFile(devFile);
        const sheet = wb.Sheets['Task Template Data']; // Confirmed sheet name
        if (sheet) {
            // Find Header Row Dynamically
            const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            let headerRowIndex = -1;
            for (let i = 0; i < 10; i++) {
                if (aoa[i] && aoa[i].some(c => String(c).trim().toLowerCase() === 'station')) {
                    headerRowIndex = i;
                    console.log(`Found Template Header at Row ${i + 1}:`);
                    console.log(JSON.stringify(aoa[i]));
                    break;
                }
            }

            if (headerRowIndex === -1) {
                console.log('Could not find Station header row.');
            } else {
                const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex }) as any[];

                const mapping = new Map<string, Set<number>>();
                const allStations = new Set<number>();

                data.forEach(row => {
                    const st = row['Station'];
                    const dept = row['Department ID'];
                    if (st && dept) {
                        const stNum = parseInt(st);
                        if (!isNaN(stNum)) {
                            allStations.add(stNum);
                            if (!mapping.has(dept)) mapping.set(dept, new Set());
                            mapping.get(dept)?.add(stNum);
                        }
                    }
                });

                // specialized output
                mapping.forEach((stations, dept) => {
                    const sorted = Array.from(stations).sort((a, b) => a - b);
                    console.log(`${dept}: Stations ${sorted.join(', ')}`);
                });
                console.log(`Total Numbered Stations Found: ${allStations.size}`);
            }
        }
    } catch (e) { console.log('Error reading Dev file', e); }

    // 2. Time Study List Structure
    console.log('\n--- Question 2: Time Study List Structure ---');
    const masterFile = 'Vederra - Labor Optimization Master.xlsx';
    try {
        const wb = XLSX.readFile(masterFile);
        const sheet = wb.Sheets['Time Study List'];
        if (sheet) {
            // Read first few rows to find the header row (usually row with "Task Name")
            const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            let headerRow = [];
            let rIndex = 0;
            for (let i = 0; i < 20; i++) {
                if (aoa[i] && (aoa[i].includes('Task Name') || aoa[i].includes('Serial #'))) {
                    headerRow = aoa[i];
                    rIndex = i;
                    console.log(`Found Study Header at Row ${i + 1}:`);
                    console.log(JSON.stringify(headerRow));
                    break;
                }
            }

            // 3. Serial IDs
            console.log('\n--- Question 3: Traveler IDs ---');
            // Check first few data rows
            if (headerRow.length > 0) {
                const serialIdx = headerRow.indexOf('Serial #');
                if (serialIdx > -1) {
                    console.log(`"Serial #" found at column index ${serialIdx}.`);
                    console.log('Sample IDs from data rows:');
                    for (let i = 1; i <= 10; i++) {
                        const row = aoa[rIndex + i];
                        if (row && row[serialIdx]) console.log(`Row ${rIndex + i + 1}: ${row[serialIdx]}`);
                    }
                }
            }
        }
    } catch (e) { console.log('Error reading Master file', e); }
}

analyze();
