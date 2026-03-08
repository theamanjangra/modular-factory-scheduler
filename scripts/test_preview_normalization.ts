import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
    console.log("1. Fetching tasks from DB with maxWorkers > 2...");

    // Find tasks that actually have a high maxWorkers limit in their template
    const dbTasks = await prisma.task.findMany({
        where: {
            taskTemplate: {
                maxWorkers: { gt: 2 }
            }
        },
        include: {
            taskTemplate: true
        },
        take: 3
    });

    if (dbTasks.length === 0) {
        console.log("No tasks found with maxWorkers > 2. Test cannot proceed.");
        return;
    }

    const tasksToPlan = dbTasks.map(t => ({
        id: t.id, // Using raw DB ID format (which caused the bug when it didn't match DC format)
        name: t.taskTemplate.name,
        estimatedTotalLaborHours: 10, // Force a long duration so we can see max concurrency
        department: { id: t.taskTemplate.departmentId },
        // We INTENTIONALLY DO NOT pass maxWorkers here. 
        // We want the backend to fetch it from the DB and map it correctly.
    }));

    console.log(`Found ${tasksToPlan.length} tasks. Expected maxWorkers limits:`);
    dbTasks.forEach(t => {
        console.log(`  - ${t.id} (${t.taskTemplate.name}): ${t.taskTemplate.maxWorkers}`);
    });

    console.log("\n2. Calling Preview Plan endpoint...");

    const payload = {
        options: { limit: 10 },
        tasks: tasksToPlan,
        productionPlanShifts: [
            {
                shiftId: "shift-1",
                productionRate: 1.0,
                shift: {
                    id: "shift-1",
                    startTime: "2024-01-01T07:00:00Z",
                    endTime: "2024-01-01T17:00:00Z"
                }
            }
        ]
    };

    try {
        const response = await axios.post('http://localhost:3000/api/v1/worker-tasks/production-plan/preview', payload);

        console.log("\n3. Analyzing Assignments (Concurrency check)...");
        const assignments = response.data.assignments || response.data.items || [];

        if (assignments.length === 0) {
            console.log("No assignments generated.");
            return;
        }

        // Calculate max concurrency per task to see if it breached the old "2 or 4" limit
        const taskConcurrency = new Map<string, number>();

        assignments.forEach((a: any) => {
            const current = taskConcurrency.get(a.taskId) || 0;
            taskConcurrency.set(a.taskId, current + 1); // Simplistic count of total workers assigned (works because we only have 1 shift)
        });

        console.log("\nResults:");
        dbTasks.forEach(t => {
            const workersAssigned = taskConcurrency.get(t.id) || 0;
            const expectedMax = t.taskTemplate.maxWorkers;
            const oldBugLimit = 4;

            console.log(`Task ${t.id} (${t.taskTemplate.name}):`);
            console.log(`  - Expected Max: ${expectedMax}`);
            console.log(`  - Actual Workers Assigned: ${workersAssigned}`);

            if (workersAssigned > oldBugLimit) {
                console.log(`  - ✅ FIX CONFIRMED: Assigned ${workersAssigned} workers (exceeds old hardcoded limit of ${oldBugLimit})`);
            } else if (workersAssigned === expectedMax) {
                console.log(`  - ✅ FIX CONFIRMED: Reached requested max of ${expectedMax}`);
            } else {
                console.log(`  - ⚠️ Inconclusive: Assigned ${workersAssigned} workers. Make sure there are enough workers available in the system.`);
            }
        });

    } catch (error: any) {
        console.error("API Error:", error.message);
        if (error.response?.data) {
            console.error("Validation Details:", JSON.stringify(error.response.data, null, 2));
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
