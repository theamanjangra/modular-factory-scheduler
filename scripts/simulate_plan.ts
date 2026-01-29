
/**
 * Simulation Script for Planning Algorithm
 * 
 * Usage: npx ts-node scripts/simulate_plan.ts
 * 
 * This script:
 * 1. Loads real Workers from 'Worker-Task algo data - Workers.csv'
 * 2. Loads real Tasks from 'Worker-Task algo data - Tasks.csv'
 * 3. Runs the PlanningService.plan() method.
 * 4. Prints a summary of assignments and preference scores.
 */

import fs from 'fs';
import path from 'path';
import { PlanningService } from '../src/services/planningService';
import { Worker, Task, PlanRequest } from '../src/types';
import { loadWorkerPreferences } from '../src/utils/preferenceLoader';

// --- CSV Parsing Helpers ---

const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
};

const readFileLines = (filePath: string): string[] => {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }
    return fs.readFileSync(absolutePath, 'utf-8').split(/\r?\n/);
};

// --- Loaders ---

function loadWorkers(): Worker[] {
    const lines = readFileLines('./Worker-Task algo data - Workers.csv');
    const workers: Worker[] = [];

    // Find Header (Name, RankedSkills)
    const headerIndex = lines.findIndex(l => l.includes('Name,RankedSkills') || l.includes('Name, RankedSkills'));
    if (headerIndex === -1) throw new Error("Could not find Workers CSV Header");

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        if (row.length < 2) continue;

        const name = row[0];
        const skillsStr = row[1]; // "closeup, drywall"

        if (!name) continue;

        const skills = skillsStr
            ? skillsStr.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0)
            : [];

        workers.push({
            workerId: `w-${i}`, // generate ID
            name: name,
            skills: skills
        });
    }
    return workers;
}

function loadTasks(): Task[] {
    const lines = readFileLines('./Worker-Task algo data - Tasks.csv');
    const tasks: Task[] = [];

    // Find Header: TaskName, LaborHoursRemaining...
    const headerIndex = lines.findIndex(l => l.includes('TaskName,LaborHoursRemaining'));
    if (headerIndex === -1) throw new Error("Could not find Tasks CSV Header");

    // Map columns based on standard expected order or parse header dynamically?
    // Header: TaskName,LaborHoursRemaining,RequiredSkills,PrerequisiteTask,MinWorkers,MaxWorkers
    // Indices: 0, 1, 2, 3, 4, 5

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        if (row.length < 2) continue;

        const name = row[0].replace(/^"|"$/g, '').replace(/""/g, '"');
        if (!name) continue;

        const hours = parseFloat(row[1]) || 4; // default 4 if missing
        const requiredSkills = row[2]
            ? row[2].split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0)
            : [];
        // Prereq (row[3]) ignored for now in simple plan request inputs (unless we link them)
        const minWorkers = parseInt(row[4]) || 1;
        const maxWorkers = parseInt(row[5]) || 4;

        tasks.push({
            taskId: `t-${i}`,
            name: name,
            estimatedRemainingLaborHours: hours,
            estimatedTotalLaborHours: hours, // assume same for start
            requiredSkills: requiredSkills,
            minWorkers: minWorkers,
            maxWorkers: maxWorkers
        });
    }
    return tasks;
}

// --- Main Simulation ---

async function run() {
    console.log("--- Loading Data ---");
    const workers = loadWorkers();
    console.log(`Loaded ${workers.length} workers.`);

    const tasks = loadTasks();
    console.log(`Loaded ${tasks.length} tasks.`);

    console.log("--- Initializing Planning Service ---");
    const service = new PlanningService();

    const request: PlanRequest = {
        workers: workers,
        tasks: tasks,
        interval: {
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 9 * 3600 * 1000).toISOString() // 9 hours
        },
        useHistorical: false
    };

    console.log("--- Running Plan ---");
    const plan = service.plan(request);
    console.log(`Generated ${plan.length} assignments.`);

    // Load preferences specifically for reporting
    const allPreferences = loadWorkerPreferences('./Worker-Task algo data - Workers.csv');

    console.log("\n--- Assignment Summary ---");

    // Group by Task
    const byTask = new Map<string, Array<{ worker: string, pref: number }>>();

    plan.forEach(item => {
        const t = tasks.find(x => x.taskId === item.taskId);
        const w = workers.find(x => x.workerId === item.workerId);
        if (!t || !w) return;

        const wPrefs = allPreferences[w.name || ""];
        const score = wPrefs ? (wPrefs[t.name || ""] ?? 3) : 3;

        if (!byTask.has(t.name || "")) {
            byTask.set(t.name || "", []);
        }
        byTask.get(t.name || "")?.push({ worker: w.name || "Unknown", pref: score });
    });

    // Print
    const sortedTaskNames = Array.from(byTask.keys()).sort();
    for (const tName of sortedTaskNames) {
        const assignments = byTask.get(tName)!;
        // Sort assignments by worker name
        assignments.sort((a, b) => a.worker.localeCompare(b.worker));

        console.log(`\nTask: ${tName}`);
        assignments.forEach(a => {
            console.log(`  -> Assigned: ${a.worker} (Preference Score: ${a.pref})`);
        });
    }

    console.log("\n--- End of Simulation ---");
}

run().catch(err => console.error(err));
