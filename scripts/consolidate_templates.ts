/**
 * CONSOLIDATE 341 task templates → 73 (one per unique name)
 *
 * For each unique name:
 *   1. Pick the template that already has tasks pointing to it (canonical)
 *   2. Migrate all time studies, TTMAs from duplicates → canonical
 *   3. Delete duplicates
 */

import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('=== CONSOLIDATE TASK TEMPLATES (341 → 73) ===\n');

    // Get all templates with counts
    const allTemplates = await prisma.taskTemplate.findMany({
        select: {
            id: true,
            name: true,
            _count: { select: { tasks: true, timeStudies: true, taskTemplateModuleAttributes: true } }
        }
    });

    console.log(`Total templates: ${allTemplates.length}`);

    // Group by name
    const byName = new Map<string, typeof allTemplates>();
    for (const t of allTemplates) {
        const list = byName.get(t.name) || [];
        list.push(t);
        byName.set(t.name, list);
    }

    console.log(`Unique names: ${byName.size}`);

    let totalMigratedTS = 0, totalMigratedTTMA = 0, totalMigratedTasks = 0;
    let totalDeleted = 0, totalKept = 0;
    let totalDeduplicatedTSMA = 0;

    for (const [name, templates] of byName) {
        if (templates.length === 1) {
            totalKept++;
            continue; // No duplicates
        }

        // Pick canonical: prefer the one with most tasks, then most TS, then most TTMAs
        templates.sort((a, b) => {
            if (b._count.tasks !== a._count.tasks) return b._count.tasks - a._count.tasks;
            if (b._count.timeStudies !== a._count.timeStudies) return b._count.timeStudies - a._count.timeStudies;
            return b._count.taskTemplateModuleAttributes - a._count.taskTemplateModuleAttributes;
        });

        const canonical = templates[0];
        const duplicates = templates.slice(1);
        totalKept++;

        // Track existing attributes on canonical to avoid duplicate TTMAs
        const existingTTMAAttrs = new Set(
            (await prisma.taskTemplateModuleAttribute.findMany({
                where: { taskTemplateId: canonical.id },
                select: { moduleAttributeId: true }
            })).map(t => t.moduleAttributeId)
        );

        for (const dup of duplicates) {
            // Migrate tasks
            const taskResult = await prisma.task.updateMany({
                where: { taskTemplateId: dup.id },
                data: { taskTemplateId: canonical.id }
            });
            totalMigratedTasks += taskResult.count;

            // Migrate time studies (and their TSMAs come along via FK)
            const tsResult = await prisma.timeStudy.updateMany({
                where: { taskTemplateId: dup.id },
                data: { taskTemplateId: canonical.id }
            });
            totalMigratedTS += tsResult.count;

            // Migrate TTMAs (only if attribute not already on canonical)
            const dupTTMAs = await prisma.taskTemplateModuleAttribute.findMany({
                where: { taskTemplateId: dup.id }
            });
            for (const ttma of dupTTMAs) {
                if (!existingTTMAAttrs.has(ttma.moduleAttributeId)) {
                    await prisma.taskTemplateModuleAttribute.update({
                        where: { id: ttma.id },
                        data: { taskTemplateId: canonical.id }
                    });
                    existingTTMAAttrs.add(ttma.moduleAttributeId);
                    totalMigratedTTMA++;
                } else {
                    // Delete duplicate TTMA
                    await prisma.taskTemplateModuleAttribute.delete({ where: { id: ttma.id } });
                    totalDeduplicatedTSMA++;
                }
            }

            // Delete the duplicate template
            await prisma.taskTemplate.delete({ where: { id: dup.id } });
            totalDeleted++;
        }
    }

    console.log(`\n--- Migration Summary ---`);
    console.log(`  Templates kept: ${totalKept}`);
    console.log(`  Templates deleted: ${totalDeleted}`);
    console.log(`  Tasks migrated: ${totalMigratedTasks}`);
    console.log(`  Time Studies migrated: ${totalMigratedTS}`);
    console.log(`  TTMAs migrated: ${totalMigratedTTMA}`);
    console.log(`  Duplicate TTMAs removed: ${totalDeduplicatedTSMA}`);

    // Final counts
    console.log('\n=== FINAL COUNTS ===');
    const counts = {
        taskTemplates: await prisma.taskTemplate.count(),
        tasks: await prisma.task.count(),
        timeStudies: await prisma.timeStudy.count(),
        timeStudyModuleAttributes: await prisma.timeStudyModuleAttribute.count(),
        taskTemplateModuleAttributes: await prisma.taskTemplateModuleAttribute.count()
    };
    console.log(JSON.stringify(counts, null, 2));

    // Verify: templates with BOTH TS and TTMAs
    const withBoth = await prisma.taskTemplate.findMany({
        where: { timeStudies: { some: {} }, taskTemplateModuleAttributes: { some: {} } },
        select: { name: true, _count: { select: { timeStudies: true, taskTemplateModuleAttributes: true, tasks: true } } }
    });
    console.log(`\nTemplates with BOTH TS and TTMA: ${withBoth.length}`);
    withBoth.forEach(t => console.log(`  "${t.name}": ${t._count.tasks} tasks, ${t._count.timeStudies} TS, ${t._count.taskTemplateModuleAttributes} TTMAs`));

    console.log('\n✅ DONE');
    await prisma.$disconnect();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
