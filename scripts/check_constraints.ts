
import * as fs from 'fs';
import * as path from 'path';
import { parseExcelData } from '../src/utils/excelLoader';

const filePath = path.join(__dirname, '../public/sample_simulation.xlsx');
const buffer = fs.readFileSync(filePath);
const { tasks } = parseExcelData(buffer);

const targetIds = ['t_23', 't_10'];
const targetTasks = tasks.filter(t => targetIds.includes(t.taskId));

console.log("--- TASK CONSTRAINTS ---");
targetTasks.forEach(t => {
    console.log(`Task: ${t.taskId} (${t.name})`);
    console.log(`  MinWorkers: ${t.minWorkers}`);
    console.log(`  MaxWorkers: ${t.maxWorkers}`);
    console.log(`  Estimated Hours: ${t.estimatedTotalLaborHours}`);
    console.log(`  Prereqs: ${t.prerequisiteTaskIds.join(', ')}`);
});
