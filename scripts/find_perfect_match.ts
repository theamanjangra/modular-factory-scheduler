
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Searching for 'Perfect Match' Task...");

    // Fetch tasks with all necessary deep relations for estimation
    const tasks = await prisma.task.findMany({
        take: 1000, // Check first 1000 tasks
        where: {
            taskTemplateId: { not: undefined }, // Prisma uses undefined for 'not null' in some versions or just omit, but 'not: null' is valid for nullable fields. 
            // Actually for required fields we don't need to filter, but let's be safe.
            // If fields are required in schema, they are required here. 
            // TaskTemplateId is required in Task model (String, not String?).
        },
        include: {
            taskTemplate: {
                include: {
                    department: true, // Fetch department via template
                    taskTemplateModuleAttributes: {
                        include: { moduleAttribute: true }
                    },
                    timeStudies: {
                        orderBy: { date: 'desc' },
                        include: {
                            timeStudyModuleAttributes: {
                                include: { moduleAttribute: true }
                            }
                        }
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
            },
            // department: true // Removed, not on Task
        }
    });

    for (const task of tasks) {
        const template = task.taskTemplate;
        const traveler = task.traveler;
        const mp = traveler?.moduleProfile;

        // 1. Must have Time Studies
        if (!template?.timeStudies || template.timeStudies.length === 0) continue;
        const validTimeStudy = template.timeStudies.find((ts: any) => ts.clockTime && ts.clockTime > 0);
        if (!validTimeStudy) continue;

        // 2. Must have Task Attributes
        if (!template.taskTemplateModuleAttributes || template.taskTemplateModuleAttributes.length === 0) continue;

        // 3. Traveler must have Module Profile with Attributes
        if (!mp?.moduleProfileModuleAttributes || mp.moduleProfileModuleAttributes.length === 0) continue;

        // 4. Must have attribute overlap
        const taskAttrs = template.taskTemplateModuleAttributes;
        const profileAttrs = mp.moduleProfileModuleAttributes;

        let hasOverlap = false;

        for (const ta of taskAttrs) {
            const match = profileAttrs.find((pa: any) => pa.moduleAttributeId === ta.moduleAttributeId);
            if (match) {
                hasOverlap = true;
                break;
            }
        }

        if (hasOverlap) {
            console.log("\nFOUND PERFECT MATCH!");
            console.log(`Task ID: ${task.id}`);
            console.log(`Task Name: ${template.name}`);
            console.log(`Traveler ID: ${traveler.id}`);
            console.log(`Department ID: ${template.department?.id || 'unknown'}`);
            console.log(`Time Study ID: ${validTimeStudy.id} (Clock Time: ${validTimeStudy.clockTime})`);

            // Output the JSON snippet
            const jsonPayload = {
                startTime: "2024-05-20T07:00:00Z",
                endTime: "2024-05-20T17:00:00Z",
                tasks: [
                    {
                        id: task.id,
                        name: template.name,
                        department: { id: template.department?.id || "00000000-0000-0000-0000-000000000000" },
                        traveler: { id: traveler.id }
                    }
                ],
                productionPlanShifts: [
                    {
                        id: "pps-uuid-match-1",
                        shift: {
                            id: "shift-1",
                            startTime: 1716188400,
                            endTime: 1716224400,
                            weekDayOrdinal: 1
                        },
                        workerTasks: [],
                        deficitTasks: []
                    }
                ]
            };

            console.log("\n--- JSON PAYLOAD ---");
            console.log(JSON.stringify(jsonPayload, null, 2));
            console.log("--------------------");

            return; // Found one, exit
        }
    }

    console.log("No perfect match found in the checked tasks.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
