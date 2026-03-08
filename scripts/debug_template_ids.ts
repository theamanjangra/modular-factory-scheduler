/**
 * Debug: Check why "Install Carpet" appears in both TTMA and TimeStudy lists
 * but the taskTemplate IDs don't match.
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
    const prisma = new PrismaClient();

    // Find "Install Carpet" task templates (could be duplicates)
    const carpets = await prisma.taskTemplate.findMany({
        where: { name: { contains: 'Install Carpet' } },
        select: { id: true, name: true }
    });
    console.log('TaskTemplates matching "Install Carpet":', JSON.stringify(carpets, null, 2));

    // Check which ones have TTMAs
    for (const tt of carpets) {
        const ttmaCount = await prisma.taskTemplateModuleAttribute.count({ where: { taskTemplateId: tt.id } });
        const tsCount = await prisma.timeStudy.count({ where: { taskTemplateId: tt.id } });
        const taskCount = await prisma.task.count({ where: { taskTemplateId: tt.id } });
        console.log(`  ${tt.id} "${tt.name}": ${ttmaCount} TTMAs, ${tsCount} TimeStudies, ${taskCount} Tasks`);
    }

    // Also check a few more templates that appear in both lists
    const sharedNames = ['Electrical Wall J-boxes', 'Load and Install Appliances'];
    for (const name of sharedNames) {
        const templates = await prisma.taskTemplate.findMany({
            where: { name: { contains: name } },
            select: { id: true, name: true }
        });
        console.log(`\n"${name}" templates: ${templates.length}`);
        for (const tt of templates) {
            const ttmaCount = await prisma.taskTemplateModuleAttribute.count({ where: { taskTemplateId: tt.id } });
            const tsCount = await prisma.timeStudy.count({ where: { taskTemplateId: tt.id } });
            console.log(`  ${tt.id}: ${ttmaCount} TTMAs, ${tsCount} TimeStudies`);
        }
    }

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
