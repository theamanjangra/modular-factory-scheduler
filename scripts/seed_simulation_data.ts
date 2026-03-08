
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding simulation data...");

    // 1. Clean up (optional, relying on unique IDs mostly but avoiding clutter if re-run on empty DB is safer)
    // For now we just add more.

    // 2. Create Departments
    const deptAssembly = await prisma.department.create({ data: { name: "Assembly " + uuidv4().substring(0, 4) } });
    const deptWiring = await prisma.department.create({ data: { name: "Wiring " + uuidv4().substring(0, 4) } });

    console.log("Created Departments");

    // 3. Create Stations
    const station1 = await prisma.station.create({ data: { name: "Station 1", order: 1 } });
    const station2 = await prisma.station.create({ data: { name: "Station 2", order: 2 } });

    // 4. Create Shifts
    const shift1 = await prisma.shift.create({
        data: {
            name: "Day Shift",
            startTime: new Date('1970-01-01T07:00:00Z'),
            endTime: new Date('1970-01-01T15:00:00Z'),
            weekdayOrdinals: [1, 2, 3, 4, 5]
        }
    });
    const shift2 = await prisma.shift.create({
        data: {
            name: "Night Shift",
            startTime: new Date('1970-01-01T15:00:00Z'),
            endTime: new Date('1970-01-01T23:00:00Z'),
            weekdayOrdinals: [1, 2, 3, 4, 5]
        }
    });

    console.log("Created Shifts");

    // 5. Create Workers (Expanded)
    const workerNames = [
        { first: "John", last: "Doe", pref: shift1.id, skills: ['framing'] },
        { first: "Jane", last: "Smith", pref: shift2.id, skills: ['electricalRough'] },
        { first: "Mike", last: "Johnson", pref: shift1.id, skills: ['framing'] },
        { first: "Emily", last: "Davis", pref: shift2.id, skills: ['electricalRough'] },
        { first: "Chris", last: "Brown", pref: shift1.id, skills: ['framing'] },
        { first: "Sarah", last: "Wilson", pref: shift2.id, skills: ['electricalRough'] },
        { first: "David", last: "Taylor", pref: shift1.id, skills: ['framing'] },
        { first: "Lisa", last: "Anderson", pref: shift2.id, skills: ['electricalRough'] }
    ];

    for (const w of workerNames) {
        await prisma.worker.create({
            data: {
                firstName: w.first,
                lastName: w.last,
                stationId: station1.id,
                shiftId: w.pref,
                rankedSkills: w.skills as any
            }
        });
    }

    console.log(`Created ${workerNames.length} Workers`);

    // 6. Create Task Templates with Time Studies
    const ttAssembly = await prisma.taskTemplate.create({
        data: {
            name: "Assemble Frame",
            departmentId: deptAssembly.id,
            stationId: station1.id,
            order: 1,
            minWorkers: 1,
            maxWorkers: Math.floor(Math.random() * (8 - 3 + 1)) + 3,
            taskType: 'default',
            rankedSkills: ['framing']
        }
    });

    // Time Study for Assembly: 12 Hours
    await prisma.timeStudy.create({
        data: {
            taskTemplateId: ttAssembly.id,
            clockTime: 12.0,
            workerCount: 1,
            date: new Date()
        }
    });

    const ttWiring = await prisma.taskTemplate.create({
        data: {
            name: "Install Wiring",
            departmentId: deptWiring.id,
            stationId: station2.id,
            order: 2,
            minWorkers: 1,
            maxWorkers: Math.floor(Math.random() * (8 - 3 + 1)) + 3,
            taskType: 'default',
            rankedSkills: ['electricalRough']
        }
    });

    // Time Study for Wiring: 8 Hours
    await prisma.timeStudy.create({
        data: {
            taskTemplateId: ttWiring.id,
            clockTime: 8.0,
            workerCount: 1,
            date: new Date()
        }
    });

    // 7. Create Travelers & Tasks (Loop)
    const project = await prisma.project.create({ data: { name: "Sim Project Expanded" } });
    const travelerTemplate = await prisma.travelerTemplate.create({ data: { name: "Standard Traveler" } });

    const UNIT_COUNT = 5;
    for (let i = 1; i <= UNIT_COUNT; i++) {
        const modProfile = await prisma.moduleProfile.create({
            data: { name: `Unit ${i}`, projectId: project.id }
        });

        const module = await prisma.module.create({
            data: {
                moduleProfileId: modProfile.id,
                travelerTemplateId: travelerTemplate.id
            }
        });

        // Unique params handled by Prisma @unique usually, but here manually ensuring
        const traveler = await prisma.traveler.create({
            data: {
                moduleId: module.id,
                travelerTemplateId: travelerTemplate.id,
                isShipped: false,
                moduleProfileId: modProfile.id
            }
        });

        // Tasks
        await prisma.task.create({
            data: {
                travelerId: traveler.id,
                taskTemplateId: ttAssembly.id,
                leadStatus: 'pending',
                qamStatus: 'pending',
                createdAt: new Date()
            }
        });

        await prisma.task.create({
            data: {
                travelerId: traveler.id,
                taskTemplateId: ttWiring.id,
                leadStatus: 'pending',
                qamStatus: 'pending',
                createdAt: new Date()
            }
        });
    }

    console.log(`Created ${UNIT_COUNT} Units with Tasks`);
    console.log("Seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
