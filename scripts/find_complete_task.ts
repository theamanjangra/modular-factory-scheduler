/**
 * Find a task with the complete data chain for labor estimation:
 * Task → TaskTemplate → TaskTemplateModuleAttributes
 *                     → TimeStudy (with clockTime > 0)
 * Task → Traveler → ModuleProfile → ModuleProfileModuleAttributes
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
    const prisma = new PrismaClient();

    // Find task templates that have BOTH time studies and TTMAs
    const templatesWithBoth = await prisma.taskTemplate.findMany({
        where: {
            taskTemplateModuleAttributes: { some: {} },
            timeStudies: { some: { clockTime: { not: null, gt: 0 } } }
        },
        select: {
            id: true,
            name: true,
            _count: {
                select: {
                    taskTemplateModuleAttributes: true,
                    timeStudies: true,
                    tasks: true
                }
            }
        }
    });

    console.log(`Task templates with BOTH TTMAs and TimeStudies: ${templatesWithBoth.length}`);
    templatesWithBoth.forEach(t => {
        console.log(`  ${t.name}: ${t._count.taskTemplateModuleAttributes} TTMAs, ${t._count.timeStudies} TS, ${t._count.tasks} tasks`);
    });

    if (templatesWithBoth.length === 0) {
        console.log('\n❌ No templates have both TTMAs and TimeStudies with clockTime > 0.');

        // Show TTMAs separately
        const withTTMA = await prisma.taskTemplate.findMany({
            where: { taskTemplateModuleAttributes: { some: {} } },
            select: { id: true, name: true },
            take: 10
        });
        console.log(`\nTemplates with TTMAs (${withTTMA.length} shown):`);
        withTTMA.forEach(t => console.log(`  ${t.name}`));

        // Show TimeStudies with clockTime
        const tsWithClock = await prisma.timeStudy.findMany({
            where: { clockTime: { not: null, gt: 0 } },
            select: { id: true, clockTime: true, taskTemplate: { select: { id: true, name: true } } },
            take: 10
        });
        console.log(`\nTime studies with clockTime > 0 (${tsWithClock.length} shown):`);
        tsWithClock.forEach(ts =>
            console.log(`  ${ts.taskTemplate.name}: clockTime=${ts.clockTime}`)
        );

        // Check for overlap
        const ttmaIds = new Set(withTTMA.map(t => t.id));
        const tsIds = new Set(tsWithClock.map(ts => ts.taskTemplate.id));
        const overlap = [...ttmaIds].filter(id => tsIds.has(id));
        console.log(`\nOverlap: ${overlap.length} templates`);
    } else {
        // Find a task for one of these templates
        const templateId = templatesWithBoth[0].id;
        const task = await prisma.task.findFirst({
            where: { taskTemplateId: templateId },
            include: {
                taskTemplate: {
                    include: {
                        taskTemplateModuleAttributes: { include: { moduleAttribute: true } },
                        timeStudies: {
                            where: { clockTime: { not: null, gt: 0 } },
                            include: { timeStudyModuleAttributes: { include: { moduleAttribute: true } } },
                            take: 1
                        }
                    }
                },
                traveler: {
                    include: {
                        moduleProfile: {
                            include: { moduleProfileModuleAttributes: { include: { moduleAttribute: true } } }
                        }
                    }
                }
            }
        });

        if (task) {
            console.log(`\n✅ Found complete task: ${task.id}`);
            console.log(`   Template: ${task.taskTemplate.name}`);
            console.log(`   Profile: ${task.traveler?.moduleProfile?.name}`);
            console.log(`   Profile Attrs: ${task.traveler?.moduleProfile?.moduleProfileModuleAttributes.length}`);
            console.log(`   TTMA: ${task.taskTemplate.taskTemplateModuleAttributes.length}`);
            console.log(`   TimeStudy clockTime: ${task.taskTemplate.timeStudies[0]?.clockTime}`);
        }
    }

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
