import axios from 'axios';
import { Worker, Task } from '../src/types';

const BASE_URL = 'http://localhost:3000/api/v1/worker-tasks';

const generateData = () => {
    const workers: Worker[] = [];
    const allTasks: Task[] = [];
    const skills = ['Welding', 'Assembly', 'Painting', 'QA', 'Logistics', 'General'];

    // 1. Load Sample Tasks (Base Job)
    const fs = require('fs');
    const path = require('path');
    const tasksPath = path.join(__dirname, 'sample_tasks.json');

    // Define the shape of the new JSON file
    interface RawTask {
        taskId: string;
        name: string;
        estimatedRemainingLaborHours: number;
        minWorkers: number;
        maxWorkers: number;
        prerequisiteTaskId: string | null;
    }

    let baseTasks: RawTask[] = [];
    try {
        const raw = fs.readFileSync(tasksPath, 'utf8');
        baseTasks = JSON.parse(raw);
    } catch (e) {
        console.error("Failed to load sample_tasks.json, using fallback.");
        return { workers: [], tasks: [] };
    }

    // 2. Generate Scaled Workload (e.g., 20 "Houses" or "Jobs" to build)
    const NUM_JOBS = 20;

    for (let j = 0; j < NUM_JOBS; j++) {
        const jobId = `Job-${j + 1}`;

        // Clone base tasks for this job
        const jobTasks = baseTasks.map(t => {
            // Suffix IDs to make them unique per job
            const newId = `${t.taskId}_${jobId}`;

            // Map singular field to array for internal logic
            let newPrereqs: string[] = [];
            if (t.prerequisiteTaskId) {
                newPrereqs = [`${t.prerequisiteTaskId}_${jobId}`];
            }

            return {
                taskId: newId,
                name: `${t.name} (${jobId})`,
                prerequisiteTaskIds: newPrereqs,
                minWorkers: t.minWorkers,
                maxWorkers: t.maxWorkers,
                requiredSkills: [], // Default empty or assign later
                estimatedTotalLaborHours: t.estimatedRemainingLaborHours, // Using remaining as total for planning
                estimatedRemainingLaborHours: t.estimatedRemainingLaborHours * (0.9 + Math.random() * 0.2)
            } as Task;
        });
        allTasks.push(...jobTasks);
    }

    // 3. Generate Workers (Index based on demand)
    // We need enough workers to cover the concurrency. 
    // 20 jobs * ~4 parallelizable tasks * ~4 workers/task = ~320 workers needed?
    // Let's create 500 to be safe and test scale.
    for (let i = 0; i < 500; i++) {
        workers.push({
            workerId: `W-${i}`,
            skills: ['General', skills[i % skills.length]] // Everyone has General + Specialty
        });
    }

    return { workers, tasks: allTasks };
};

const runLoadTest = async () => {
    const { workers, tasks } = generateData();

    console.log(`Payload: ${workers.length} Workers, ${tasks.length} Tasks.`);
    console.log("Sending constraints for a full 7-Day planning window...");

    const startTime = Date.now();

    try {
        const res = await axios.post(`${BASE_URL}/plan`, {
            interval: {
                startTime: "2025-01-01T00:00:00Z",
                endTime: "2025-01-08T00:00:00Z"
            },
            useHistorical: false,
            workers,
            tasks
        });

        const duration = Date.now() - startTime;
        console.log(`\nSUCCESS!`);
        console.log(`Generated ${res.data.items.length} assignment intervals.`);
        console.log(`Time taken: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);

        // Write full result to file
        const fs = require('fs');
        const outputPath = 'load_test_results.json';
        fs.writeFileSync(outputPath, JSON.stringify(res.data, null, 2));
        console.log(`\nFull JSON output written to: ${outputPath}`);

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error:", error.message);
            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", error.response.data);
            }
        } else {
            console.error(error);
        }
    }
};

runLoadTest();
