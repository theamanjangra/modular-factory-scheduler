
import * as fs from 'fs';
import * as path from 'path';

const resultsPath = path.join(__dirname, '..', 'load_test_results.json');
const tasksPath = path.join(__dirname, 'sample_tasks.json');

// Helper to load JSON
function loadJson(p: string) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function verify() {
    console.log("Verifying dependencies...");

    // 1. Load Data
    const results = loadJson(resultsPath); // { items: WorkerTask[] }
    const baseTasks = loadJson(tasksPath); // Task[]

    // 2. Re-construct the full task set (since we scaled it)
    // We can infer dependencies from the ID structure: "baseID_Job-N"
    // Dependency: "basePrereq_Job-N"

    // Map: TaskID -> Set of PrerequisiteIDs
    const taskDeps = new Map<string, Set<string>>();

    // We need to inspect the ACTUAL tasks used in the results. 
    // The results only have taskIds.
    // Let's create a map of BaseID -> BasePrereqs from sample_tasks.json
    const baseDepMap = new Map<string, string[]>();
    baseTasks.forEach((t: any) => {
        // Updated for singular prerequisiteTaskId
        if (t.prerequisiteTaskId) {
            baseDepMap.set(t.taskId, [t.prerequisiteTaskId]);
        } else {
            baseDepMap.set(t.taskId, []);
        }
    });

    // 3. Analyze Execution Times
    // Map: TaskID -> { start: number, end: number } (Global Min Start, Global Max End)
    const taskTimings = new Map<string, { start: number, end: number }>();

    const items = results.items || results; // Handle if it's wrapped or array

    items.forEach((item: any) => {
        const start = new Date(item.startDate).getTime();
        const end = new Date(item.endDate).getTime();

        if (!taskTimings.has(item.taskId)) {
            taskTimings.set(item.taskId, { start, end });
        } else {
            const t = taskTimings.get(item.taskId)!;
            t.start = Math.min(t.start, start);
            t.end = Math.max(t.end, end);
        }
    });

    console.log(`Found timing data for ${taskTimings.size} unique tasks.`);

    let errors = 0;
    let checks = 0;

    // 4. Verify
    taskTimings.forEach((timing, taskId) => {
        // Parse ID to get BaseID and JobSuffix
        // Format: "taskId_Job-N"
        // Base IDs might contain hyphens, so split by last Underscore is safer? 
        // Logic in loadTest: `${t.taskId}_${jobId}`

        const lastUnderscore = taskId.lastIndexOf('_');
        if (lastUnderscore === -1) return; // Should not happen with our load test data

        const baseId = taskId.substring(0, lastUnderscore);
        const jobId = taskId.substring(lastUnderscore + 1); // e.g. "Job-1"

        const prereqs = baseDepMap.get(baseId);
        // Debug Log
        if (taskId.includes('interior-tape-mud-2nd-coat') && baseId.includes('interior-tape-mud-2nd-coat')) {
            console.log(`Checking ${taskId}: baseId=${baseId}, prereqs=${JSON.stringify(prereqs)}`);
        }

        if (!prereqs || prereqs.length === 0) return;

        // Check each prereq
        prereqs.forEach(basePrereq => {
            const fullPrereqId = `${basePrereq}_${jobId}`;

            const pTiming = taskTimings.get(fullPrereqId);
            if (!pTiming) {
                // If prereq was never scheduled, but dependent was, that's a problem 
                // UNLESS the prereq wasn't required? In our model, prereqs are hard.
                console.error(`❌ Error: Task ${taskId} started, but prereq ${fullPrereqId} was never scheduled!`);
                errors++;
                return;
            }

            checks++;

            // Rule: Start(Task) >= End(Prereq)
            // In our time-stepped simulation, it might be Start(Task) >= Prereq(End) - step?
            // No, Strict dependency means strictly sequential.
            // Let's check strictness.
            if (timing.start < pTiming.end) {
                console.error(`❌ Dependency Violation: Task ${taskId} started at ${new Date(timing.start).toISOString()} BEFORE Prereq ${fullPrereqId} finished at ${new Date(pTiming.end).toISOString()}`);
                errors++;
            }
        });
    });

    if (errors === 0) {
        console.log(`✅ Success: All ${checks} dependencies respected.`);
    } else {
        console.log(`❌ Failed: Found ${errors} dependency violations.`);
        process.exit(1);
    }
}

verify();
