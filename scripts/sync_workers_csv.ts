
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const EXCEL_FILE = 'Vederra Data Loading Developer (1).xlsx';
const OUTPUT_CSV = 'Worker-Task algo data - Workers.csv';

function syncWorkers() {
    console.log(`🚀 Starting Worker CSV Sync...`);
    console.log(`   Source: ${EXCEL_FILE}`);
    console.log(`   Target: ${OUTPUT_CSV}`);

    if (!fs.existsSync(EXCEL_FILE)) {
        console.error(`❌ Error: Source file '${EXCEL_FILE}' not found.`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(EXCEL_FILE);

    const sheetName = 'Workers';
    console.log(`   Available Sheets: ${workbook.SheetNames.join(', ')}`);
    const sheet = workbook.Sheets[sheetName];

    // Find all sheets starting with "Workers"
    const workerSheetNames = workbook.SheetNames.filter(name => name.toLowerCase().startsWith('workers'));

    if (workerSheetNames.length === 0) {
        console.error(`❌ Error: No sheets starting with 'Workers' found.`);
        process.exit(1);
    }

    console.log(`   Found ${workerSheetNames.length} worker sheets: ${workerSheetNames.join(', ')}`);

    const allWorkers: Record<string, any>[] = [];
    const allTaskColumns = new Set<string>();

    // Excluded columns (metadata)
    const metadataCols = new Set(['Name', 'RankedSkills', 'ShiftPreference', 'Shift Preference', 'Shift', 'Department']);

    for (const sName of workerSheetNames) {
        console.log(`   Processing ${sName}...`);
        const sheet = workbook.Sheets[sName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];


        // Find Header (Look for "First Name")
        let hRowIdx = -1;
        for (let i = 0; i < rows.length; i++) {
            const firstCell = rows[i][0]?.toString().trim().toLowerCase();
            if (firstCell === 'first name' || firstCell === 'first name ') {
                hRowIdx = i;
                break;
            }
        }

        if (hRowIdx === -1) {
            console.warn(`   ⚠️ Warning: No 'First Name' header in ${sName}, skipping.`);
            continue;
        }

        const header = rows[hRowIdx];
        const data = rows.slice(hRowIdx + 1);

        console.log(`   Found header in ${sName}:`, header.slice(0, 5).join(', ') + '...');

        // Collect Task Columns
        // Exclude known metadata columns
        const ignore = new Set(['First Name', 'Last Name', 'Employee ID', 'Shift', 'Station', 'Role', 'Skills']);

        const taskColIndices: number[] = [];
        header.forEach((col: any, idx: number) => {
            const cStr = String(col || '').trim();
            // Store mapping if it's a valid task column
            if (cStr && !ignore.has(cStr) && !cStr.toLowerCase().includes('shift')) {
                allTaskColumns.add(cStr);
                taskColIndices.push(idx);
            }
        });

        // Parse Rows
        for (const row of data) {
            // Check presence of First Name
            if (!row || row.length === 0) continue;
            const firstName = row[header.findIndex((h: string) => h?.trim().toLowerCase() === 'first name')]?.toString().trim();
            const lastName = row[header.findIndex((h: string) => h?.trim().toLowerCase() === 'last name')]?.toString().trim();

            if (!firstName && !lastName) continue;

            const fullName = `${firstName || ''} ${lastName || ''}`.trim();

            const workerObj: Record<string, any> = {};
            workerObj['Name'] = fullName;

            header.forEach((h: any, idx: number) => {
                const key = String(h || '').trim();
                if (key && allTaskColumns.has(key)) {
                    workerObj[key] = row[idx];
                }
            });
            allWorkers.push(workerObj);
        }
    }

    // Build Master Header
    const sortedTaskCols = Array.from(allTaskColumns).sort();
    const masterHeader = ['Name', 'RankedSkills', ...sortedTaskCols];

    // Build CSV Info Header (3 lines)
    let csvContent = "Workers" + ",".repeat(masterHeader.length - 1) + "\n";
    csvContent += ",".repeat(masterHeader.length - 1) + "\n";
    csvContent += ",,Task Preferences --->,\"1 = PRIMARY JOB,     2 = SECONDARY JOB,     3 = CAN HELP,     4 = CAN NOT HELP\"" + ",".repeat(Math.max(0, masterHeader.length - 4)) + "\n";

    // Header Row
    csvContent += masterHeader.map(h => h.includes(',') ? `"${h}"` : h).join(",") + "\n";

    // Data Rows
    let count = 0;
    for (const w of allWorkers) {
        const rowArr = masterHeader.map(col => {
            let val = w[col];
            if (col === 'Name' || col === 'RankedSkills') {
                const str = String(val !== undefined ? val : '').trim();
                return str.includes(',') ? `"${str}"` : str;
            } else {
                // Task Score
                if (val !== undefined && val !== null && val !== '') {
                    return val;
                }
                return ''; // Empty if not present for this worker
            }
        });
        csvContent += rowArr.join(",") + "\n";
        count++;
    }


    fs.writeFileSync(OUTPUT_CSV, csvContent);
    console.log(`✅ Successfully generated '${OUTPUT_CSV}' with ${count} workers.`);

    // Also copy to src/services for safety if it looks there
    const servicePath = path.join('src', 'services', OUTPUT_CSV);
    // Actually, BalancingService defaults to './Worker-Task algo data - Workers.csv' which is relative to CWD (root).
    // So root is fine.
}

syncWorkers();
