
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Department Tasks...");

    // 1. Fetch all Departments
    const departments = await prisma.department.findMany();
    console.log(`Found ${departments.length} departments.`);

    if (departments.length === 0) {
        console.error("No departments found! Please seed departments first.");
        return;
    }

    // 2. Ensure a ModuleProfile exists
    let profile = await prisma.moduleProfile.findFirst({ where: { name: 'Seeding Profile' } });
    if (!profile) {
        profile = await prisma.moduleProfile.create({
            data: { name: 'Seeding Profile' }
        });
    }

    // 3. Ensure a TravelerTemplate exists
    let travelerTemplate = await prisma.travelerTemplate.findFirst({ where: { name: 'Seeding Template' } });
    if (!travelerTemplate) {
        travelerTemplate = await prisma.travelerTemplate.create({
            data: { name: 'Seeding Template' }
        });
    }

    // 4. Create a dummy Traveler for these tasks
    // We modify the name to ensure it stands out
    const travelerId = 'seed-dept-traveler-v1';
    let traveler = await prisma.traveler.findUnique({ where: { id: travelerId } });

    if (!traveler) {
        traveler = await prisma.traveler.create({
            data: {
                id: travelerId,
                travelerTemplateId: travelerTemplate.id,
                moduleProfileId: profile.id,
                isShipped: false, // Critical for simulation pickup
                notesRequiredUpload: false
            }
        });
        console.log("Created Seeding Traveler:", traveler.id);
    } else {
        console.log("Using existing Seeding Traveler:", traveler.id);
    }

    // 5. Ensure a Station exists (for TaskTemplate)
    let station = await prisma.station.findFirst();
    if (!station) {
        // Create one if absolutely empty
        station = await prisma.station.create({
            data: { name: 'Seeding Station', doesReceiveTravelers: true }
        });
    }

    // 6. Loop Departments and Seed Tasks
    for (const dept of departments) {
        // Check existing tasks for this traveler + department
        // We actually need to check TaskTemplates -> Department
        // Let's just create them blindly or check if our specific seeded ones exist to avoid duplicates
        const baseName1 = `Task A - ${dept.name}`;
        const baseName2 = `Task B - ${dept.name}`;

        await ensureTask(dept.id, station.id, traveler.id, baseName1);
        await ensureTask(dept.id, station.id, traveler.id, baseName2);
    }

    console.log("Seeding Complete.");
}

async function ensureTask(deptId: string, stationId: string, travelerId: string, taskName: string) {
    // 1. Find or Create TaskTemplate
    // We link it to the department
    let template = await prisma.taskTemplate.findFirst({
        where: {
            name: taskName,
            departmentId: deptId
        }
    });

    if (!template) {
        template = await prisma.taskTemplate.create({
            data: {
                name: taskName,
                departmentId: deptId,
                stationId: stationId,
                taskType: 'default',
                order: 1,
                minWorkers: 1,
                maxWorkers: 2,
                estimatedTotalLaborHours: 4.0, // Default duration
                // Add default skill if needed? Schema says rankedSkills is Skill[] enum array
                rankedSkills: ['framing'],
            }
        });
        console.log(`Created Template: ${taskName}`);
    }

    // 2. Find or Create Task
    let task = await prisma.task.findFirst({
        where: {
            taskTemplateId: template.id,
            travelerId: travelerId
        }
    });

    if (!task) {
        task = await prisma.task.create({
            data: {
                taskTemplateId: template.id,
                travelerId: travelerId,
                leadStatus: 'pending', // Critical for simulation pickup
                qamStatus: 'pending'
            }
        });
        console.log(`Created Task: ${taskName}`);
    } else {
        // Ensure it's pending so it shows up
        if (task.leadStatus !== 'pending') {
            await prisma.task.update({
                where: { id: task.id },
                data: { leadStatus: 'pending' }
            });
            console.log(`Reset Task Status: ${taskName}`);
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
