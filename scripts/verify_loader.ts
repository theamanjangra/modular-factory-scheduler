
import * as fs from 'fs';
import * as path from 'path';
import { loadStationTemplateMap, loadCrossDeptTasks, loadSkilledWorkers } from '../src/utils/stationDepartmentLoader';

async function verify() {
    const masterPath = path.resolve('Vederra - Labor Optimization Master.xlsx');
    const devPath = path.resolve('Vederra Data Loading Developer.xlsx');

    console.log('Reading files...');
    const masterBuf = fs.readFileSync(masterPath);
    const devBuf = fs.readFileSync(devPath);

    console.log('Loading Template Map...');
    const map = loadStationTemplateMap(devBuf);
    console.log('Map snippets (Station 1):', JSON.stringify(map[1] ? { dept: map[1].department, tasks: Array.from(map[1].tasks.keys()) } : 'Not Found', null, 2));

    console.log('Loading Tasks...');
    const tasks = loadCrossDeptTasks(masterBuf, map);
    console.log(`Loaded ${tasks.length} tasks.`);

    if (tasks.length > 0) {
        console.log('First 3 tasks:');
        console.log(JSON.stringify(tasks.slice(0, 3), null, 2));
    }

    console.log('Loading Workers...');
    const workers = loadSkilledWorkers(masterBuf, map);
    console.log(`Loaded ${workers.length} workers.`);
    if (workers.length > 0) {
        console.log('First 2 workers:');
        console.log(JSON.stringify(workers.slice(0, 2), null, 2));
    }
}

verify().catch(console.error);
