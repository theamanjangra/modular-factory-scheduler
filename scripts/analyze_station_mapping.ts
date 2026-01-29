
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

function analyze() {
    const masterFile = 'Vederra - Labor Optimization Master.xlsx';
    const developerFile = 'Vederra Data Loading Developer.xlsx';

    console.log(`Analyzing ${masterFile}...`);
    try {
        const wbMaster = XLSX.readFile(masterFile);
        const sheetNameMaster = 'Time Study List';
        if (wbMaster.Sheets[sheetNameMaster]) {
            const sheet = wbMaster.Sheets[sheetNameMaster];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            console.log(`Headers in '${sheetNameMaster}':`, data[0]);
            console.log(`First 5 rows in '${sheetNameMaster}':`);
            data.slice(1, 6).forEach(row => console.log(row));

            // Extract unique stations from column 0 (assuming it is Station based on user input)
            const stations = new Set();
            data.slice(1).forEach(row => {
                if (row[0]) stations.add(row[0]);
            });
            console.log(`Unique items in Col 0 (Stations?):`, Array.from(stations).slice(0, 20)); // Limit to first 20
        } else {
            console.log(`Sheet '${sheetNameMaster}' not found in ${masterFile}`);
            console.log('Available sheets:', wbMaster.SheetNames);
        }
    } catch (e) {
        console.error(`Error reading ${masterFile}:`, e);
    }

    console.log(`\nAnalyzing ${developerFile}...`);
    try {
        const wbDev = XLSX.readFile(developerFile);
        const sheetNameDev = 'Task Template Data';
        if (wbDev.Sheets[sheetNameDev]) {
            const sheet = wbDev.Sheets[sheetNameDev];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            console.log(`Headers in '${sheetNameDev}':`, data[0]);
            console.log(`First 5 rows in '${sheetNameDev}':`);
            data.slice(1, 6).forEach(row => console.log(row));
        } else {
            console.log(`Sheet '${sheetNameDev}' not found in ${developerFile}`);
            console.log('Available sheets:', wbDev.SheetNames);
        }
    } catch (e) {
        console.error(`Error reading ${developerFile}:`, e);
    }
}

analyze();
