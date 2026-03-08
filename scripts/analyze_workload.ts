
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Analyzing Workload vs Capacity...");

    // 1. Calculate Capacity
    const workers = await prisma.worker.findMany();
    const shifts = 2; // Assuming 2 shifts active
    const hoursPerShift = 8;
    const totalCapacity = workers.length * shifts * hoursPerShift;

    console.log(`\n--- Capacity ---`);
    console.log(`Workers: ${workers.length}`);
    console.log(`Potential Man-Hours (2 shifts): ${totalCapacity} hours`);

    // 2. Calculate Workload
    const tasks = await prisma.task.findMany({
        where: { leadStatus: 'pending' },
        include: {
            taskTemplate: {
                include: { timeStudies: true }
            }
        }
    });

    let totalTaskHours = 0;
    tasks.forEach(t => {
        // Use TimeStudy or default
        const duration = t.taskTemplate.timeStudies[0]?.clockTime || 4.0;
        totalTaskHours += duration;
    });

    console.log(`\n--- Workload ---`);
    console.log(`Active Tasks: ${tasks.length}`);
    console.log(`Total Task Hours: ${totalTaskHours.toFixed(1)} hours`);

    // 3. Utilization
    const utilization = (totalTaskHours / totalCapacity) * 100;
    console.log(`\n--- Utilization ---`);
    console.log(`Global Utilization: ${utilization.toFixed(1)}%`);

    // 4. Per Department
    const depts = await prisma.department.findMany({
        include: {
            taskTemplates: { include: { tasks: true, timeStudies: true } },
            workerDepartments: true
        }
    });

    console.log(`\n--- Per Department ---`);
    for (const d of depts) {
        const deptWorkers = d.workerDepartments.length;
        // Count active tasks for this dept (via template)
        // Check tasks that link to templates of this dept
        // Actually we need to check tasks where taskTemplate.departmentId == d.id

        // Easier: filter the main tasks list
        const deptTasks = tasks.filter(t => t.taskTemplate.departmentId === d.id);
        const deptHours = deptTasks.reduce((acc, t) => acc + (t.taskTemplate.timeStudies[0]?.clockTime || 4.0), 0);

        console.log(`${d.name}: ${deptWorkers} workers, ${deptTasks.length} tasks, ${deptHours.toFixed(1)} hrs`);
    }

}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
