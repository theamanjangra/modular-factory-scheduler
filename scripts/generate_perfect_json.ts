
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Searching for PERFECT MATCH tasks...');

    // 1. Get all templates with their attributes
    const templates = await prisma.taskTemplate.findMany({
        include: {
            taskTemplateModuleAttributes: { include: { moduleAttribute: true } },
            timeStudies: { include: { timeStudyModuleAttributes: { include: { moduleAttribute: true } } } }
        }
    });

    // 2. Filter for "Perfect" templates
    const perfectTemplateIds = new Set<string>();

    for (const t of templates) {
        const reqAttrs = new Set(t.taskTemplateModuleAttributes.map(a => a.moduleAttributeId));
        if (reqAttrs.size === 0) continue;

        let isPerfect = false;
        for (const ts of t.timeStudies) {
            const tsAttrs = new Set(ts.timeStudyModuleAttributes.map(a => a.moduleAttributeId));

            // Intersection Check
            const intersection = [...reqAttrs].filter(x => tsAttrs.has(x));
            if (intersection.length > 0 && intersection.length === reqAttrs.size) {
                isPerfect = true;
                break;
            }
        }

        if (isPerfect) {
            perfectTemplateIds.add(t.id);
        }
    }

    console.log(`✅ Found ${perfectTemplateIds.size} Perfect Templates.`);

    // 3. Find Tasks that use these templates
    const perfectTasks = await prisma.task.findMany({
        where: { taskTemplateId: { in: Array.from(perfectTemplateIds) } },
        include: { taskTemplate: true, traveler: true },
        take: 5 // Just get a few for the payload
    });

    console.log(`📋 Found ${perfectTasks.length} existing Tasks using these templates.`);

    // 4. Construct JSON Payload
    const payload = {
        interval: {
            startTime: "2024-05-20T08:00:00Z",
            endTime: "2024-05-20T17:00:00Z"
        },
        workers: [], // Can be empty if we want auto-fetch, or list dummy
        useHistorical: false,
        tasks: perfectTasks.map(t => ({
            taskId: t.id,
            name: t.name,
            minWorkers: 1,
            maxWorkers: 2,
            shiftCompletionPreference: 'mustCompleteWithinShift'
        }))
    };

    if (perfectTasks.length === 0) {
        console.warn('⚠️ WARNING: No tasks found in DB that use the perfect templates.');
        console.warn('   You may need to create a Task linked to one of these Templates first.');
        console.log('   Perfect Template Names:', templates.filter(t => perfectTemplateIds.has(t.id)).map(t => t.name).slice(0, 5));
    }

    // Output JSON
    console.log('\n--- JSON PAYLOAD (Copy for Postman) ---\n');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n---------------------------------------\n');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
