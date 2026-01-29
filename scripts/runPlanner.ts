import * as fs from 'fs';
import * as path from 'path';
import { PlanningService } from '../src/services/planningService';
import { PlanRequest, Worker, Task } from '../src/types';

function loadTasks(): Task[] {
    const tasksPath = path.join(process.cwd(), 'src', 'data', 'tasks.json');
    if (!fs.existsSync(tasksPath)) throw new Error('tasks.json not found at ' + tasksPath);
    const txt = fs.readFileSync(tasksPath, 'utf8');
    return JSON.parse(txt) as Task[];
}

function sampleWorkers(): Worker[] {
    // Simple sample: 4 general workers, two with limited availability
    const start = '2025-01-01T08:00:00Z';
    const noon = '2025-01-01T12:00:00Z';
    const end = '2025-01-01T16:00:00Z';

    return [
        { workerId: 'A1', skills: ['General'] },
        { workerId: 'A2', skills: ['General'] },
        { workerId: 'M1', skills: ['General'], availability: { startTime: start, endTime: noon } },
        { workerId: 'M2', skills: ['General'], availability: { startTime: start, endTime: noon } }
    ];
}

function buildPlanRequest(tasks: Task[]): PlanRequest {
    const start = '2025-01-01T08:00:00Z';
    const end = '2025-01-01T16:00:00Z';
    return {
        workers: sampleWorkers(),
        tasks,
        interval: { startTime: start, endTime: end },
        useHistorical: false
    };
}

async function main() {
    try {
        const tasks = loadTasks();
        const request = buildPlanRequest(tasks);
        const planner = new PlanningService();
        const results = planner.plan(request);
        const outPath = path.join(process.cwd(), 'scripts', 'planner_output.json');
        fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
        console.log('Planner ran successfully. Output written to', outPath);
        console.log(JSON.stringify(results.slice(0, 20), null, 2));
    } catch (err) {
        console.error('Error running planner:', err);
        process.exit(1);
    }
}

main();
