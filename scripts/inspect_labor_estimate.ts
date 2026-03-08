
import { PrismaClient } from '@prisma/client';
import { LaborEstimationService } from '../src/services/laborEstimationService';

const prisma = new PrismaClient();
const estimationService = new LaborEstimationService(prisma);

async function main() {
    const taskId = "00088621-c478-46b3-8aeb-03b5745922f1";
    console.log(`Inspecting Task: ${taskId}`);

    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
            taskTemplate: true
        }
    });

    if (!task) {
        console.error("Task not found!");
        return;
    }

    console.log("--- Task Details ---");
    console.log(`Name: ${task.taskTemplate.name}`);
    console.log(`Min Workers: ${task.taskTemplate.minWorkers}`);
    console.log(`Max Workers: ${task.taskTemplate.maxWorkers}`);

    console.log("\n--- Labor Estimation ---");
    try {
        const estimates = await estimationService.estimateLaborHours([taskId]);
        const hours = estimates.get(taskId);
        console.log(`Estimated Total Labor Hours: ${hours}`);
    } catch (e) {
        console.error("Estimation failed:", e);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
