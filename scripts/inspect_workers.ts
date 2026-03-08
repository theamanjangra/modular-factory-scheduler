import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("--- Inspecting Worker Data ---");

    // Get all workers and include related data (skills, preferences, etc.)
    const workers = await prisma.worker.findMany({
        include: {
            workerTaskTemplates: {
                include: { taskTemplate: true }
            },
            station: true,
            shift: true,
            workerDepartments: { include: { department: true } }
        }
    });

    for (const w of workers) {
        console.log(`\n👷 WORKER: ${w.firstName} ${w.lastName} (ID: ${w.id.substring(0, 8)}...)`);
        console.log(`   Shift: ${w.shift?.name || 'None'}`);
        console.log(`   Station: ${w.station?.name || 'None'}`);
        console.log(`   Role: ${w.role || 'None'}`);
        console.log(`   Ranked Skills (Enum): ${w.rankedSkills.join(', ') || 'None'}`);

        // Departments
        const depts = w.workerDepartments.map(wd => wd.department.name).join(', ');
        console.log(`   Departments: ${depts || 'None'}`);

        // Preferences (WorkerTaskTemplate)
        if (w.workerTaskTemplates.length > 0) {
            console.log(`   Task Preferences:`);
            for (const wtt of w.workerTaskTemplates) {
                console.log(`     - ${wtt.taskTemplate.name}: ${wtt.preference}`);
            }
        } else {
            console.log(`   Task Preferences: NONE (Only RankedSkills)`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
