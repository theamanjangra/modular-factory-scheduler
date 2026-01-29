
import * as xlsx from 'xlsx';
import * as path from 'path';

const filePath = path.resolve(process.cwd(), 'final_minus_one.xlsx');
console.log(`Reading file: ${filePath}`);

try {
    const workbook = xlsx.readFile(filePath);

    // Define exact worker IDs we are looking for
    const targetWorkers = new Set(['w_17', 'w_18', 'w_19']);

    const sheetsToInspect = ['Shift 1 Assignments', 'Idle Workers'];

    sheetsToInspect.forEach(sheetName => {
        if (!workbook.SheetNames.includes(sheetName)) {
            console.log(`\nSheet '${sheetName}' not found in workbook.`);
            return;
        }

        console.log(`\n--- Inspecting ${sheetName} for w_17, w_18, w_19 ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        // Sort logic just for readability (by Start time)
        // data.sort((a: any, b: any) => (a.Start > b.Start ? 1 : -1));

        const matches = data.filter((row: any) => {
            const workerId = String(row['Worker'] || row['WorkerId'] || "");
            return targetWorkers.has(workerId);
        });

        if (matches.length === 0) {
            console.log("No entries found.");
        } else {
            console.log(`Found ${matches.length} entries:`);
            // Print all headers first
            if (matches.length > 0) {
                console.log("Columns:", Object.keys(matches[0] as object));
            }

            matches.forEach((row: any) => {
                // Simplify output
                const summary = {
                    Worker: row['Worker'],
                    Task: row['Task'],
                    Start: row['Start'] ? new Date(row['Start']).toLocaleTimeString() : 'N/A',
                    End: row['End'] ? new Date(row['End']).toLocaleTimeString() : 'N/A',
                    Duration: row['DurationHrs']
                };
                console.log(JSON.stringify(summary));
            });
        }
    });

} catch (error) {
    console.error("Error reading file:", error);
}
