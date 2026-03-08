import { PrismaClient, Skill } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const DUMMY_NAMES = [
    "Alex Rivera", "Jordan Lee", "Casey Smith", "Riley Chen", "Taylor Davis",
    "Morgan White", "Drew Miller", "Jamie Wilson", "Avery Brown", "Cameron Taylor",
    "Quinn Anderson", "Peyton Thomas", "Skyler Martinez", "Dakota Garcia", "Hayden Robinson"
];

const ALL_SKILLS: Skill[] = [
    'framing', 'finishCarpentry', 'electricalTrim', 'electricalRough',
    'plumbing', 'drywallHanging', 'drywallMud', 'texture', 'painting',
    'roofing', 'flooring', 'boxMoving', 'cutting', 'hvac'
];

async function main() {
    console.log("🚀 Generating Dummy Workers for Simulation...");

    // 1. Get Context (Shift & Departments)
    const dayShift = await prisma.shift.findFirst({ where: { name: { contains: "Day Shift" } } });
    if (!dayShift) throw new Error("Day Shift not found! Run import logic first.");

    const generalStation = await prisma.station.findFirst({ where: { name: "General" } });
    if (!generalStation) throw new Error("General Station not found!");

    const departments = await prisma.department.findMany();
    if (departments.length === 0) throw new Error("No departments found!");

    console.log(`Using Shift: ${dayShift.name}`);
    console.log(`Found ${departments.length} Departments: ${departments.map(d => d.name).join(', ')}`);

    // Cleanup old dummies
    console.log("Cleaning up old dummy workers...");
    // Find workers with employeeId starting with DUMMY
    const oldDummies = await prisma.worker.findMany({
        where: { employeeId: { startsWith: 'DUMMY' } }
    });

    for (const d of oldDummies) {
        // Delete related records first
        try { await prisma.workerDepartment.deleteMany({ where: { workerId: d.id } }); } catch (e) { }
        try { await prisma.workerTaskTemplate.deleteMany({ where: { workerId: d.id } }); } catch (e) { }
        try { await prisma.worker.delete({ where: { id: d.id } }); } catch (e) { }
    }
    console.log(`Deleted ${oldDummies.length} old dummy workers.`);

    let createdCount = 0;

    // 2. Create Workers
    for (const name of DUMMY_NAMES) {
        const [first, ...lastParts] = name.split(' ');
        const last = lastParts.join(' ');

        // Pick a Random Department
        const dept = departments[Math.floor(Math.random() * departments.length)];

        // Random Skills (1 to 4 skills)
        const skillCount = Math.floor(Math.random() * 4) + 1;
        const shuffled = [...ALL_SKILLS].sort(() => 0.5 - Math.random());
        const selectedSkills = shuffled.slice(0, skillCount);

        const wId = uuidv4();

        // Create Worker
        const worker = await prisma.worker.create({
            data: {
                id: wId,
                firstName: first,
                lastName: last,
                employeeId: `DUMMY-${1000 + createdCount}`,
                stationId: generalStation.id, // Still attached to General Station physically
                shiftId: dayShift.id,
                rankedSkills: selectedSkills,
                role: 'worker'
            }
        });

        // Assign to Department
        await prisma.workerDepartment.create({
            data: {
                id: uuidv4(),
                workerId: worker.id,
                departmentId: dept.id
            }
        });

        console.log(`+ Created ${name} [${dept.name}] - Skills: ${selectedSkills.length}`);
        createdCount++;
    }

    console.log(`\n✅ Successfully created ${createdCount} dummy workers assigned to departments.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
