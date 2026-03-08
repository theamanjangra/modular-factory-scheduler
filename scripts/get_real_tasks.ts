import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Get real tasks with traveler
    const tasks = await prisma.task.findMany({
        take: 5,
        include: {
            traveler: true,
            taskTemplate: true,
        }
    });

    console.log('=== REAL TASKS ===');
    tasks.forEach(t => {
        console.log(JSON.stringify({
            id: t.id,
            taskTemplateId: t.taskTemplateId,
            taskTemplateName: (t as any).taskTemplate?.name,
            travelerId: t.travelerId,
        }, null, 2));
    });

    // Get real shifts
    const shifts = await prisma.shift.findMany({ take: 3 });
    console.log('\n=== REAL SHIFTS ===');
    shifts.forEach(s => {
        console.log(JSON.stringify({
            id: s.id,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            weekdayOrdinals: s.weekdayOrdinals,
        }, null, 2));
    });

    // Get departments
    const depts = await prisma.department.findMany({ take: 3 });
    console.log('\n=== DEPARTMENTS ===');
    depts.forEach(d => {
        console.log(JSON.stringify({ id: d.id, name: d.name }, null, 2));
    });

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
