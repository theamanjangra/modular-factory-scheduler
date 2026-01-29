const XLSX = require('xlsx');

const wb = XLSX.readFile('./results.xlsx');

// Check Completion Status
const sheet = wb.Sheets['Completion Status'];
const data = XLSX.utils.sheet_to_json(sheet);
console.log('=== Completion Status ===');
let violations = 0;
data.forEach((row: any) => {
    const done = parseFloat(row.DoneHours);
    const total = parseFloat(row.TotalHours);
    if (done > total) violations++;
    console.log(`${(row.Task || 'Unknown').slice(0, 25)}: ${done.toFixed(2)}/${total.toFixed(2)} ${done > total ? '❌' : '✅'}`);
});
console.log(`Over-completion Violations: ${violations}`);

console.log('');

// Check Task Switching
const assignSheet = wb.Sheets['Assignments'];
const assigns: any[] = XLSX.utils.sheet_to_json(assignSheet);
console.log(`=== Assignments: ${assigns.length} ===`);

const workerTasks: Record<string, string[]> = {};
assigns.forEach((a: any) => {
    if (!workerTasks[a.Worker]) workerTasks[a.Worker] = [];
    workerTasks[a.Worker].push(a.Task);
});

let totalSwitches = 0;
Object.entries(workerTasks).forEach(([w, tasks]) => {
    let sw = 0;
    for (let i = 1; i < tasks.length; i++) {
        if (tasks[i] !== tasks[i - 1]) sw++;
    }
    totalSwitches += sw;
    if (sw > 0) {
        console.log(`  ${w.slice(0, 15)}: ${sw} switches`);
    }
});
console.log(`Total Task Switches: ${totalSwitches}`);
