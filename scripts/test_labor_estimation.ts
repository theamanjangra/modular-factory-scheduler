/**
 * Test script for the LaborEstimationService
 * 
 * Fetches tasks from the database and runs the labor estimation algorithm,
 * printing intermediate values (attribute intersections, ratios, final estimate).
 * 
 * Usage: npx ts-node scripts/test_labor_estimation.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log('=== Labor Estimation Test ===\n');

        // 1. Find tasks that have a traveler with a moduleProfile
        const tasks = await prisma.task.findMany({
            take: 5,
            include: {
                taskTemplate: {
                    include: {
                        taskTemplateModuleAttributes: {
                            include: { moduleAttribute: true }
                        },
                        timeStudies: {
                            include: {
                                timeStudyModuleAttributes: {
                                    include: { moduleAttribute: true }
                                }
                            },
                            orderBy: { date: 'desc' }
                        }
                    }
                },
                traveler: {
                    include: {
                        moduleProfile: {
                            include: {
                                moduleProfileModuleAttributes: {
                                    include: { moduleAttribute: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        console.log(`Found ${tasks.length} tasks in DB.\n`);

        if (tasks.length === 0) {
            console.log('No tasks found. Make sure the database is seeded.');
            return;
        }

        // 2. For each task, print the data chain
        for (const task of tasks) {
            console.log(`--- Task: ${task.id} ---`);
            console.log(`  TaskTemplate: ${task.taskTemplate?.id} (${task.taskTemplate?.name})`);
            console.log(`  Traveler: ${task.traveler?.id}`);

            const moduleProfile = task.traveler?.moduleProfile;
            if (!moduleProfile) {
                console.log(`  ⚠ No ModuleProfile on Traveler. Skipping.\n`);
                continue;
            }

            console.log(`  ModuleProfile: ${moduleProfile.id} (${moduleProfile.name})`);

            // Module Profile attributes
            const mpAttrs = moduleProfile.moduleProfileModuleAttributes;
            console.log(`  Module Attributes (${mpAttrs.length}):`);
            for (const a of mpAttrs) {
                console.log(`    - ${a.moduleAttribute.name}: ${a.value}`);
            }

            // Task template attributes
            const ttAttrs = task.taskTemplate?.taskTemplateModuleAttributes || [];
            console.log(`  Task Template Attributes (${ttAttrs.length}):`);
            for (const a of ttAttrs) {
                console.log(`    - ${a.moduleAttribute.name} (${a.moduleAttributeId})`);
            }

            // Intersection
            const mpAttrIds = new Set(mpAttrs.map(a => a.moduleAttributeId));
            const intersection = ttAttrs.filter(a => mpAttrIds.has(a.moduleAttributeId));
            console.log(`  Intersection: ${intersection.length} attributes`);

            // Time studies
            const timeStudies = task.taskTemplate?.timeStudies || [];
            console.log(`  Time Studies: ${timeStudies.length}`);
            if (timeStudies.length > 0) {
                const ts = timeStudies[0];
                console.log(`    Best: ${ts.id}, clockTime=${ts.clockTime}, workerCount=${ts.workerCount}`);
                console.log(`    TS Attributes:`);
                for (const tsa of ts.timeStudyModuleAttributes) {
                    console.log(`      - ${tsa.moduleAttribute.name}: ${tsa.value}`);
                }

                // Calculate
                if (intersection.length > 0 && ts.clockTime && ts.clockTime > 0) {
                    let totalRatio = 0;
                    let validCount = 0;
                    for (const attr of intersection) {
                        const moduleVal = parseFloat(mpAttrs.find(a => a.moduleAttributeId === attr.moduleAttributeId)!.value);
                        const tsAttr = ts.timeStudyModuleAttributes.find(a => a.moduleAttributeId === attr.moduleAttributeId);
                        if (tsAttr) {
                            const tsVal = parseFloat(tsAttr.value);
                            if (tsVal > 0) {
                                const ratio = moduleVal / tsVal;
                                totalRatio += ratio;
                                validCount++;
                                console.log(`    Ratio for "${attr.moduleAttribute.name}": ${moduleVal}/${tsVal} = ${ratio.toFixed(3)}`);
                            }
                        }
                    }
                    if (validCount > 0) {
                        const avg = totalRatio / validCount;
                        const estimate = ts.clockTime * avg;
                        console.log(`  ✅ Estimate: ${ts.clockTime} × ${avg.toFixed(3)} = ${estimate.toFixed(2)} hours`);
                    } else {
                        console.log(`  ❌ No valid ratios could be computed.`);
                    }
                } else {
                    console.log(`  ❌ Cannot calculate: no intersection or no clockTime.`);
                }
            } else {
                console.log(`  ❌ No time studies found for this task template.`);
            }

            console.log('');
        }

        // 3. Also test the service itself
        console.log('\n=== Service Test ===\n');
        const { LaborEstimationService } = await import('../src/services/laborEstimationService');
        const service = new LaborEstimationService(prisma);
        const taskIds = tasks.map(t => t.id);
        const results = await service.estimateLaborHours(taskIds);
        console.log('\nResults Map:');
        for (const [id, hours] of results) {
            console.log(`  ${id}: ${hours.toFixed(2)} hours`);
        }

    } catch (e: any) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
