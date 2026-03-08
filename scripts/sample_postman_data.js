
const fs = require('fs');

const inputPath = 'preview_verify.json';
const outputPath = 'postman_sample.json';

try {
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Truncate arrays for sample
    if (data.shifts) {
        data.shifts = data.shifts.map(s => ({
            ...s,
            workerTasks: s.workerTasks ? s.workerTasks.slice(0, 2) : [],
            deficitTasks: s.deficitTasks ? s.deficitTasks.slice(0, 2) : []
        }));
    }

    if (data.tasks) {
        data.tasks = data.tasks.slice(0, 2);
    }

    if (data.workers) {
        data.workers = data.workers.slice(0, 2);
    }

    // Check other large arrays
    if (data.deficitTasks) data.deficitTasks = data.deficitTasks.slice(0, 2);
    if (data.idleWorkers) data.idleWorkers = data.idleWorkers.slice(0, 2);
    if (data.violations) data.violations = data.violations.slice(0, 2);

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Sample data written to ${outputPath}`);

} catch (err) {
    console.error("Error processing file:", err);
}
