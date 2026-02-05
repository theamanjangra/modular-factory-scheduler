
import { PrismaClient, TaskStatus, TaskType, Skill } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Seeding Demo Travelers & Tasks...");

    // 1. Ensure we have a Traveler Template
    let template = await prisma.travelerTemplate.findFirst({
        where: { name: 'Demo Build Template' }
    });

    if (!template) {
        template = await prisma.travelerTemplate.create({
            data: { name: 'Demo Build Template' }
        });
        console.log("✅ Created 'Demo Build Template'");
    }

    // 2. Fetch all Task Templates (seeded from Excel)
    const taskTemplates = await prisma.taskTemplate.findMany({
        orderBy: { order: 'asc' }
    });

    if (taskTemplates.length === 0) {
        console.warn("⚠️ No Task Templates found! Creating fallback defaults...");
        // Fallback: Create generic tasks linked to Depts we hopefully have
        const depts = await prisma.department.findMany();
        if (depts.length === 0) {
            console.error("❌ No Departments either! Run seed_master_data.ts first.");
            return;
        }
        const station = await prisma.station.findFirst() || await prisma.station.create({ data: { name: 'Gen Station' } });

        await prisma.taskTemplate.create({
            data: { name: 'Frame Defaults', departmentId: depts[0].id, stationId: station.id, taskType: TaskType.default, order: 1, minWorkers: 1, maxWorkers: 2, rankedSkills: [Skill.framing] }
        });
        await prisma.taskTemplate.create({
            data: { name: 'Install Defaults', departmentId: depts[0].id, stationId: station.id, taskType: TaskType.default, order: 2, minWorkers: 1, maxWorkers: 2, rankedSkills: [Skill.plumbing] }
        });
        console.log("✅ Created 2 Fallback Tasks.");

        // Re-fetch
        taskTemplates.push(...await prisma.taskTemplate.findMany());
    }
    console.log(`ℹ️  Found ${taskTemplates.length} Task Templates to assign.`);

    // 3. Link them to the Traveler Template (idempotent)
    /*
    for (const tt of taskTemplates) {
        const exists = await prisma.travelerTemplateTaskTemplate.findFirst({
            where: {
                travelerTemplateId: template.id,
                taskTemplateId: tt.id
            }
        });
        if (!exists) {
            await prisma.travelerTemplateTaskTemplate.create({
                data: {
                    travelerTemplateId: template.id,
                    taskTemplateId: tt.id
                }
            });
        }
    }
    console.log("✅ Linked Task Templates to Traveler Template");
    */

    // 4. Create Active Travelers (Transactions)
    // Fetch a few Module Profiles to assign to
    const profiles = await prisma.moduleProfile.findMany({ take: 5 });
    if (profiles.length === 0) {
        console.error("❌ No Module Profiles found!");
        return;
    }

    for (const profile of profiles) {
        // Check if traveler exists for this profile
        const exists = await prisma.traveler.findFirst({
            where: { moduleProfileId: profile.id }
        });

        if (exists) {
            console.log(`ℹ️  Traveler already exists for ${profile.name}`);
            continue;
        }

        // Create Traveler
        const traveler = await prisma.traveler.create({
            data: {
                travelerTemplateId: template.id,
                moduleProfileId: profile.id,
                notesRequiredUpload: false,
                isShipped: false
            }
        });
        console.log(`  + Created Traveler for ${profile.name}`);

        // Create Tasks for this Traveler
        // We create a Task for EACH TaskTemplate
        let createdCount = 0;
        for (const tt of taskTemplates) {
            await prisma.task.create({
                data: {
                    taskTemplateId: tt.id,
                    travelerId: traveler.id,
                    leadStatus: TaskStatus.pending,
                    qamStatus: TaskStatus.pending
                }
            });
            createdCount++;
        }
        console.log(`    -> Created ${createdCount} Tasks`);

        // Create TravelerStation entries (Active Work)
        // Assign to first station found in tasks
        if (taskTemplates.length > 0) {
            const firstStationId = taskTemplates[0].stationId;
            await prisma.travelerStation.create({
                data: {
                    travelerId: traveler.id,
                    stationId: firstStationId,
                    isCurrent: true, // Mark as active!
                    taskProgress: 0
                }
            });
        }
    }

    console.log("\n✅ Demo Transactions Seeded Successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
