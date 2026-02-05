
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Verifying Database Counts...");

    const counts = {
        workers: await prisma.worker.count(),
        departments: await prisma.department.count(),
        moduleProfiles: await prisma.moduleProfile.count(),
        taskTemplates: await prisma.taskTemplate.count(),
        timeStudies: await prisma.timeStudy.count(),
        moduleAttributes: await prisma.moduleAttribute.count(),
        projects: await prisma.project.count()
    };

    console.table(counts);

    // List some sample data to be sure
    const sampleProfile = await prisma.moduleProfile.findFirst({ include: { moduleProfileModuleAttributes: true } });
    if (sampleProfile) {
        console.log(`\nSample Profile: ${sampleProfile.name} (Attributes: ${sampleProfile.moduleProfileModuleAttributes.length})`);
    }

    const sampleTaskness = await prisma.taskTemplate.findFirst({ include: { taskTemplateModuleAttributes: true } });
    if (sampleTaskness) {
        console.log(`Sample Task: ${sampleTaskness.name} (Drivers: ${sampleTaskness.taskTemplateModuleAttributes.length})`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
