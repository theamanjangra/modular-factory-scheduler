
import * as fs from 'fs';
import * as path from 'path';
import { parseExcelData } from '../src/utils/excelLoader';

const FILE_PATH = path.resolve(__dirname, '../sample_simulation 2.xlsx');

async function check() {
    console.log(`Checking file: ${FILE_PATH}`);
    const buffer = fs.readFileSync(FILE_PATH);
    const data = await parseExcelData(buffer);

    console.log(`\n--- CONTENT REPORT ---`);
    console.log(`Workers Found: ${data.workers.length}`);
    console.log(`Tasks Found:   ${data.tasks.length}`);
    console.log(`\nWorker IDs: ${data.workers.map(w => w.workerId).join(', ')}`);
}

check().catch(console.error);
