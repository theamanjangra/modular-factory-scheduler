
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// CONFIG
const FILE_PATH = 'Vederra - Labor Optimization Master.xlsx';
const WORKER_COUNT = 16;
const SHIFT_HOURS = 10;
const SHIFT_CAPACITY = WORKER_COUNT * SHIFT_HOURS;

// Fuzzy Matcher for Column Names
function findMatchingColumn(target: string, columns: string[]): string | null {
    const normalizedTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Direct match
    if (columns.includes(target)) return target;

    // Normalized match
    const bestMatch = columns.find(col => {
        const normalizedCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');
        // "Length of Box" vs "Length" -> "length" is in "lengthofbox"
        return normalizedTarget.includes(normalizedCol) || normalizedCol.includes(normalizedTarget);
    });

    return bestMatch || null;
}

function calculateRates() {
    // 1. Load Workbook
    const wb = xlsx.readFile(FILE_PATH);

    // 2. Load Sheets
    const boxSheet = wb.Sheets['Box Charcteristics'];
    const ratioSheet = wb.Sheets['Labor Ratios'];

    if (!boxSheet || !ratioSheet) {
        console.error("Missing required sheets!");
        return;
    }

    const boxes = xlsx.utils.sheet_to_json<any>(boxSheet, { range: 3 }); // Row 4 (0-based) is header
    const ratios = xlsx.utils.sheet_to_json<any>(ratioSheet, { range: 4 }); // Row 5 is header? Let's check output.
    // Box Output showed index 3 (Row 4) -> "Serial Number"
    // Ratio Output showed index 4 (Row 5) -> "Global Task #"

    // So: Box -> range 3. Ratio -> range 4.

    console.log(`Loaded ${boxes.length} boxes and ${ratios.length} ratios.`);
    console.log(`Capacity: ${SHIFT_CAPACITY} Man-Hours (16 workers * 10h)`);

    // 3. Process Logic
    const boxRates: any[] = [];

    // Identify valid ratio rows (some are blank/example)
    const validRatios = ratios.filter(r => r['Linked To Characteristic'] && r['Ratio of Characteristic Per Hour']);

    // Cache Column Mapping
    const boxColumns = Object.keys(boxes[0]);
    const columnMap: Record<string, string> = {};

    validRatios.forEach(r => {
        const key = r['Linked To Characteristic'];
        if (!columnMap[key]) {
            const match = findMatchingColumn(key, boxColumns);
            if (match) {
                columnMap[key] = match;
            } else {
                console.warn(`[Warning] No match found for characteristic: "${key}"`);
            }
        }
    });

    console.log("\n--- Column Mappings ---");
    console.log(columnMap);

    // Calculate for each box
    console.log("\n--- Box Production Rates ---");
    console.log("Serial | Total Hours | Calculated Rate");

    boxes.slice(0, 10).forEach(box => { // Limit to 10 for demo
        let totalHours = 0;
        const details: string[] = [];

        validRatios.forEach(r => {
            const charName = r['Linked To Characteristic'];
            const ratio = r['Ratio of Characteristic Per Hour']; // Units per Hour ?? Or Hours per Unit?
            // "Ratio of Characteristic Per Hour" -> e.g. "7.12".
            // Example: Length 70.5. Ratio 7.12. Hours = 3.3? 
            // 70.5 / 7.12 = 9.9. 
            // The row 1 example says: Length 70.5, Ratio 7.12, Time Study 3.3 hours? 
            // Wait. 70.5 / 7.12 = 9.9. 
            // Maybe "Ratio" is "Feet per Hour"? Yes.
            // But 3.3 hours * 3 workers = 9.9 Man Hours.
            // So Total Man Hours = Attribute / Ratio.

            const col = columnMap[charName];
            if (col) {
                const val = box[col];
                if (typeof val === 'number') {
                    // Avoid div by zero
                    if (ratio && ratio !== 0) {
                        const hours = val / ratio;
                        totalHours += hours;
                        // details.push(`${charName}(${val})/${ratio}=${hours.toFixed(1)}`);
                    }
                }
            }
        });

        // Add Base Fixed Time? (If any rows have no characteristic)
        // Assume pure variable for now.

        const rate = SHIFT_CAPACITY / totalHours;

        console.log(`${box['Serial Number']} | ${totalHours.toFixed(2)} hrs | ${rate.toFixed(2)} boxes/shift`);

        boxRates.push({
            serial: box['Serial Number'],
            hours: totalHours,
            rate: rate
        });
    });

    // Average Rate
    const avgRate = boxRates.reduce((sum, b) => sum + b.rate, 0) / boxRates.length;
    console.log(`\nAverage Rate: ${avgRate.toFixed(2)}`);
}

calculateRates();
