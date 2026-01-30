import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding master data...');

    // 1. Create Departments
    const deptAssembly = await prisma.department.create({
        data: { name: 'Assembly', description: 'General Assembly Line' }
    });
    const deptLogistics = await prisma.department.create({
        data: { name: 'Logistics', description: 'Shipping and Receiving' }
    });
    console.log('✅ Departments seeded');

    // 2. Create Shifts
    await prisma.shift.createMany({
        data: [
            { name: 'Shift 1', startTime: '06:00', endTime: '14:30' },
            { name: 'Shift 2', startTime: '14:30', endTime: '23:00' }
        ]
    });
    console.log('✅ Shifts seeded');

    // 3. Create Workers
    await prisma.worker.createMany({
        data: [
            { name: 'John Doe', departmentId: deptAssembly.id, shiftId: 'shift-1', crews: ['A'] },
            { name: 'Jane Smith', departmentId: deptAssembly.id, shiftId: 'shift-1', crews: ['A'] },
            { name: 'Bob Jones', departmentId: deptLogistics.id, shiftId: 'shift-2', crews: ['B'] },
        ]
    });
    console.log('✅ Workers seeded');

    // 4. Create Module Profiles
    const profileStandard = await prisma.moduleProfile.create({
        data: {
            name: 'Standard Unit',
            description: 'Standard residential module',
            moduleAttributes: {
                create: [
                    { attributeName: 'WallType', attributeValue: 'Drywall' },
                    { attributeName: 'FloorType', attributeValue: 'Vinyl' }
                ]
            }
        }
    });
    console.log('✅ Module Profiles seeded');

    // 5. Create Traveler Templates
    const templateA = await prisma.travelerTemplate.create({
        data: {
            name: 'Residential Flow A',
            departmentId: deptAssembly.id,
            taskTemplates: {
                create: [
                    { taskName: 'Frame Walls', laborHours: 4.5, minCrew: 2, optimalCrew: 3 },
                    { taskName: 'Install Plumbing', laborHours: 3.0, minCrew: 1, optimalCrew: 2 },
                    { taskName: 'Electrical Rough-in', laborHours: 2.5, minCrew: 1, optimalCrew: 1 }
                ]
            }
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
