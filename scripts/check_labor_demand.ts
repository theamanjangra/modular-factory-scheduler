
import * as fs from 'fs';
import * as path from 'path';
import { parseExcelData } from '../src/utils/excelLoader';

const INPUT_FILE = path.resolve(__dirname, '../sample_simulation 2.xlsx');

async function checkDemand() {
    console.log(`\n🔍 Checking Labor Demand: ${path.basename(INPUT_FILE)}\n`);

    const buf = fs.readFileSync(INPUT_FILE);
    const data = await parseExcelData(buf);

    let totalHours = 0;
    data.tasks.forEach(t => {
        const h = t.estimatedTotalLaborHours || 0;
        totalHours += h;
        console.log(`- ${t.name}: ${h} hrs`);
    });

    console.log(`\n---------------------------`);
    console.log(`TOTAL REQUIRED HOURS: ${totalHours.toFixed(2)}`);

    const workers = data.workers.length;
    const shift8 = workers * 8;
    const shift10 = workers * 10;

    console.log(`Capacity (8h):  ${shift8} hours`);
    console.log(`Capacity (10h): ${shift10} hours`);

    if (totalHours > shift8) {
        console.log(`\n❌ IMPOSSIBLE in 8 Hours.`);
        console.log(`   Deficit: ${(totalHours - shift8).toFixed(2)} worker-hours.`);
    } else {
        console.log(`\n✅ THEORETICALLY POSSIBLE in 8 Hours.`);
        console.log(`   Slack: ${(shift8 - totalHours).toFixed(2)} worker-hours.`);
    }
}

checkDemand().catch(console.error);
