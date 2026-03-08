
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEPARTMENTS = [
    'Framing',
    'Electrical',
    'Plumbing',
    'Assembly',
    'Logistics'
];

async function main() {
    console.log("Starting Department & Task Reset...");

    // 1. Clean up existing data
    console.log("Cleaning up old data...");

    // Level 1: Logs & Issues
    await prisma.workerTask.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.taskInterruption.deleteMany({});
    await prisma.timeLog.deleteMany({}); // Clear time logs too
    await prisma.notification.deleteMany({});

    // Level 2: Tasks & Items
    await prisma.task.deleteMany({});
    await prisma.adhocTask.deleteMany({});
    await prisma.adhocInspectionItem.deleteMany({});
    await prisma.inspectionItem.deleteMany({});
    await prisma.travelerStation.deleteMany({});
    await prisma.travelerInspectionArea.deleteMany({});

    // Level 3: Modules & Traveler
    // Modules link to Traveler -- need to delete Module first
    await prisma.module.deleteMany({});

    // Now safe to delete Travelers
    await prisma.traveler.deleteMany({});

    // Level 4: Templates
    await prisma.timeStudyModuleAttribute.deleteMany({});
    await prisma.timeStudy.deleteMany({});
    await prisma.workerTaskTemplate.deleteMany({});
    await prisma.taskTemplateModuleAttribute.deleteMany({});
    await prisma.travelerTemplateTaskTemplate.deleteMany({});
    await prisma.taskTemplate.deleteMany({});
    await prisma.inspectionItemTemplate.deleteMany({});

    // Level 5: Organization
    await prisma.workerDepartment.deleteMany({});
    await prisma.department.deleteMany({});

    console.log("Cleanup Complete.");

    // 2. Create Departments
    console.log("Creating 5 Core Departments...");
    const deptMap = new Map<string, string>(); // Name -> ID
    for (const name of DEPARTMENTS) {
        const d = await prisma.department.create({
            data: { name }
        });
        deptMap.set(name, d.id);
        console.log(` - Created ${name}`);
    }

    // 3. Ensure Station 
    let station = await prisma.station.findFirst();
    if (!station) {
        station = await prisma.station.create({
            data: { name: 'Main Station', doesReceiveTravelers: true, order: 1 }
        });
    }

    // 4. Create New Traveler & Module together
    // Need template & profile
    let profile = await prisma.moduleProfile.findFirst() || await prisma.moduleProfile.create({ data: { name: 'Reset Profile' } });
    let tmpl = await prisma.travelerTemplate.findFirst() || await prisma.travelerTemplate.create({ data: { name: 'Reset Template' } });

    // Create Module first (to satisfy potential NOT NULL on Traveler.moduleId)
    console.log("Creating Base Module...");
    const module = await prisma.module.create({
        data: {
            moduleProfileId: profile.id,
            travelerTemplateId: tmpl.id
        }
    });

    console.log(`Created Module: ${module.id}. Creating Traveler...`);

    const traveler = await prisma.traveler.create({
        data: {
            travelerTemplateId: tmpl.id,
            moduleProfileId: profile.id,
            moduleId: module.id, // Link to module immediately
            isShipped: false
        }
    });

    console.log(`Created Traveler: ${traveler.id}. Updating Module link...`);

    // Update Module to link back to Traveler
    await prisma.module.update({
        where: { id: module.id },
        data: { travelerId: traveler.id }
    });

    // 5. Seed Tasks (2-4 per Dept)
    console.log("Seeding Tasks...");
    for (const [name, deptId] of deptMap.entries()) {
        const count = Math.floor(Math.random() * 3) + 2; // 2 to 4
        console.log(` - Seeding ${count} tasks for ${name}`);

        for (let i = 1; i <= count; i++) {
            const taskName = `${name} Task ${i}`;
            const duration = Math.floor(Math.random() * 4) + 2; // 2-6 hours

            const tmpl = await prisma.taskTemplate.create({
                data: {
                    name: taskName,
                    departmentId: deptId,
                    stationId: station.id,
                    taskType: 'default', // Using string literal matching enum
                    order: i,
                    minWorkers: 1,
                    maxWorkers: 2
                }
            });

            // Create TimeStudy for duration
            await prisma.timeStudy.create({
                data: {
                    taskTemplateId: tmpl.id,
                    clockTime: duration,
                    workerCount: 1,
                    date: new Date()
                }
            });

            await prisma.task.create({
                data: {
                    taskTemplateId: tmpl.id,
                    travelerId: traveler.id,
                    leadStatus: 'pending',
                    qamStatus: 'pending'
                }
            });
        }
    }

    // 6. Re-assign Workers
    console.log("Re-assigning Workers to new Departments...");
    const workers = await prisma.worker.findMany();
    for (const w of workers) {
        // Pick random department
        const randomDeptName = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
        const deptId = deptMap.get(randomDeptName);

        if (deptId) {
            await prisma.workerDepartment.create({
                data: {
                    workerId: w.id,
                    departmentId: deptId,
                    isLead: false
                }
            });
        }
    }
    console.log(`Re-assigned ${workers.length} workers.`);

    console.log("Reset & Seed Complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
