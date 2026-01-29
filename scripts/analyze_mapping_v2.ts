
import * as XLSX from 'xlsx';

function analyze() {
    const masterFile = 'Vederra - Labor Optimization Master.xlsx';
    const developerFile = 'Vederra Data Loading Developer.xlsx';

    // 1. Get Station Map from Developer file
    console.log(`--- Mapping from ${developerFile} ---`);
    const wbDev = XLSX.readFile(developerFile);
    const sheetDev = wbDev.Sheets['Task Template Data'];
    // Headers are on row index 1 (0-based) because row 0 is title
    const dataDev = XLSX.utils.sheet_to_json(sheetDev, { header: 1 }) as any[][];
    if (dataDev.length > 2) {
        const headers = dataDev[1];
        const stationIdx = headers.indexOf('Station');
        const deptIdx = headers.indexOf('Department ID');

        console.log(`Headers found: Station at ${stationIdx}, Dept at ${deptIdx}`);

        const map = new Map<number, string>();
        for (let i = 2; i < dataDev.length; i++) {
            const row = dataDev[i];
            const station = row[stationIdx];
            const dept = row[deptIdx];
            if (station && dept) {
                map.set(station, dept);
            }
        }

        // Sort by station
        const sortedStations = Array.from(map.keys()).sort((a, b) => Number(a) - Number(b));
        sortedStations.forEach(s => {
            console.log(`Station ${s} -> ${map.get(s)}`);
        });
    }

    // 2. Inspect Master file for Traveler/Module columns
    console.log(`\n--- Inspecting ${masterFile} ---`);
    const wbMaster = XLSX.readFile(masterFile);
    const sheetMaster = wbMaster.Sheets['Time Study List'];
    if (sheetMaster) {
        const dataMaster = XLSX.utils.sheet_to_json(sheetMaster, { header: 1 }) as any[][];
        console.log('Headers (Row 0):', dataMaster[0]);
        // Also check if headers are on row 1 maybe?
        console.log('Row 1:', dataMaster[1]);
    }
}

analyze();
