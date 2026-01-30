import { PrismaClient, TaskType, Skill } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding master data (Vederra Schema Compliant v2)...');

    // 1. Create Department
    const deptAssembly = await prisma.department.create({
        data: { name: 'Assembly' }
    });
    const deptLogistics = await prisma.department.create({
        data: { name: 'Logistics' }
    });
    console.log('✅ Departments seeded');

    // 1b. Create Inspection Area (Required for Station)
    const areaMain = await prisma.inspectionArea.create({
        data: { name: 'Main Floor', order: 1 }
    });

    // 1c. Create Station (Required for Worker & TaskTemplate)
    const station1 = await prisma.station.create({
        data: { name: 'Station 1', order: 1, inspectionAreaId: areaMain.id }
    });
    console.log('✅ Stations seeded');

    // 2. Create Shifts
    const baseDate = '1970-01-01';
    await prisma.shift.createMany({
        data: [
            {
                name: 'Shift 1',
                startTime: new Date(`${baseDate}T06:00:00Z`),
                endTime: new Date(`${baseDate}T14:30:00Z`)
            },
            {
                name: 'Shift 2',
                startTime: new Date(`${baseDate}T14:30:00Z`),
                endTime: new Date(`${baseDate}T23:00:00Z`)
            }
        ]
    });
    // Fetch shifts back to get IDs
    const shifts = await prisma.shift.findMany();
    const shift1 = shifts.find(s => s.name === 'Shift 1');
    const shift2 = shifts.find(s => s.name === 'Shift 2');
    console.log('✅ Shifts seeded');

    // 3. Create Workers
    await prisma.worker.createMany({
        data: [
            {
                firstName: 'John',
                lastName: 'Doe',
                stationId: station1.id,
                shiftId: shift1?.id,
                rankedSkills: [Skill.framing]
            },
            {
                firstName: 'Jane',
                lastName: 'Smith',
                stationId: station1.id,
                shiftId: shift1?.id,
                rankedSkills: [Skill.electricalRough]
            },
            {
                firstName: 'Bob',
                lastName: 'Jones',
                stationId: station1.id,
                shiftId: shift2?.id,
                rankedSkills: [Skill.boxMoving]
            },
        ]
    });
    console.log('✅ Workers seeded');

    // 4. Create Module Profiles
    const profileStandard = await prisma.moduleProfile.create({
        data: {
            name: 'Standard Unit',
        }
    });
    console.log('✅ Module Profiles seeded');

    // 5. Create Traveler Templates & Task Templates
    const templateA = await prisma.travelerTemplate.create({
        data: {
            name: 'Residential Flow A',
        }
    });

    // Create TaskTemplate
    const taskTmpl1 = await prisma.taskTemplate.create({
        data: {
            name: 'Frame Walls',
            stationId: station1.id,
            departmentId: deptAssembly.id,
            taskType: TaskType.default,
            order: 1,
            minWorkers: 2,
            maxWorkers: 3,
        }
    });

    const taskTmpl2 = await prisma.taskTemplate.create({
        data: {
            name: 'Install Plumbing',
            stationId: station1.id,
            departmentId: deptAssembly.id,
            taskType: TaskType.default,
            order: 2,
            minWorkers: 1,
            maxWorkers: 2,
        }
    });

    // Link TaskTemplates to TravelerTemplate
    await prisma.travelerTemplateTaskTemplate.create({
        data: {
            travelerTemplateId: templateA.id,
            taskTemplateId: taskTmpl1.id
        }
    });
    await prisma.travelerTemplateTaskTemplate.create({
        data: {
            travelerTemplateId: templateA.id,
            taskTemplateId: taskTmpl2.id
        }
    });

    // Create TimeStudies to give them a "standard time"
    await prisma.timeStudy.create({
        data: {
            taskTemplateId: taskTmpl1.id,
            clockTime: 4.5, // Assuming Hours based on typical MES usage
            workerCount: 2,
            date: new Date()
        }
    });
    await prisma.timeStudy.create({
        data: {
            taskTemplateId: taskTmpl2.id,
            clockTime: 3.0,
            workerCount: 1,
            date: new Date()
        }
    });

    console.log('✅ Traveler Templates seeded');

    console.log('\n🎉 Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
