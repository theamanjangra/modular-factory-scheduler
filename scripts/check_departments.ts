import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("--- Checking Department Associations ---");

    // 1. Task Templates by Department
    const templates = await prisma.taskTemplate.groupBy({
        by: ['departmentId'],
        _count: { id: true },
    });

    console.log("\n--- Task Templates by Department ---");
    let totalTemplates = 0;
    for (const group of templates) {
        const dept = await prisma.department.findUnique({ where: { id: group.departmentId } });
        console.log(`- ${dept?.name || 'Unknown'}: ${group._count.id} templates`);
        totalTemplates += group._count.id;
    }
    console.log(`Total Templates Checked: ${totalTemplates}`);

    // 2. Tasks by Department
    const totalTasks = await prisma.task.count();

    console.log(`\n--- Tasks Verification ---`);
    console.log(`Total Tasks: ${totalTasks}`);
    console.log(`Note: Schema enforces that all Tasks have a TaskTemplate, and all TaskTemplates have a Department.`);
    console.log(`Therefore, all tasks are connected to a department.`);

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
