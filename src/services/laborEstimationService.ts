import { PrismaClient } from '@prisma/client';

/**
 * LaborEstimationService
 * 
 * Calculates estimated labor hours for tasks using proportional scaling
 * from Time Studies and Module Profile attributes.
 * 
 * Algorithm:
 * 1. Get module attributes (values) from ModuleProfile via Traveler
 * 2. Get relevant attributes for this task type from TaskTemplateModuleAttribute
 * 3. Intersect to find applicable attributes with values
 * 4. Get reference Time Study and its attribute values
 * 5. Calculate proportional ratio per attribute (equal weighting)
 * 6. estimatedHours = timeStudy.clockTime * averageRatio
 */
export class LaborEstimationService {
    private prisma: PrismaClient;

    constructor(prisma?: PrismaClient) {
        this.prisma = prisma || new PrismaClient();
    }

    /**
     * Estimate labor hours for a list of task IDs.
     * Returns Map<taskId, estimatedHours>.
     */
    async estimateLaborHours(taskIds: string[]): Promise<Map<string, number>> {
        const results = new Map<string, number>();

        // 1. Fetch all tasks with their relationships
        const tasks = await this.prisma.task.findMany({
            where: { id: { in: taskIds } },
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
                            orderBy: { date: 'desc' }  // Most recent first
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

        for (const task of tasks) {
            try {
                const estimate = await this.calculateForTaskWithFallback(task);
                results.set(task.id, estimate);
                console.log(`[LaborEstimation] Task "${task.id}": ${estimate.toFixed(2)} hours`);
            } catch (e: any) {
                console.warn(`[LaborEstimation] Task "${task.id}" skipped: ${e.message}`);
                // Fall back to a default estimate if calculation fails
                results.set(task.id, 1.0);
            }
        }

        return results;
    }

    /**
     * Try direct calculation first; if the task's own template is missing TTMAs
     * or TimeStudies, search for sibling templates with the same name.
     */
    private async calculateForTaskWithFallback(task: any): Promise<number> {
        const taskTemplate = task.taskTemplate;
        const hasTTMAs = taskTemplate?.taskTemplateModuleAttributes?.length > 0;
        const hasTimeStudies = taskTemplate?.timeStudies?.length > 0 &&
            taskTemplate.timeStudies.some((ts: any) => ts.clockTime && ts.clockTime > 0);

        if (hasTTMAs && hasTimeStudies) {
            return this.calculateForTask(task);
        }

        // Fallback: find sibling templates with the same name
        if (!taskTemplate?.name) {
            throw new Error(`TaskTemplate "${taskTemplate?.id}" has no name for fallback lookup`);
        }

        const siblings = await this.prisma.taskTemplate.findMany({
            where: {
                name: taskTemplate.name,
                id: { not: taskTemplate.id }
            },
            include: {
                taskTemplateModuleAttributes: { include: { moduleAttribute: true } },
                timeStudies: {
                    include: { timeStudyModuleAttributes: { include: { moduleAttribute: true } } },
                    orderBy: { date: 'desc' }
                }
            }
        });

        // Merge: use the first sibling that has the missing piece
        let mergedTTMAs = taskTemplate.taskTemplateModuleAttributes;
        let mergedTimeStudies = taskTemplate.timeStudies;

        if (!hasTTMAs) {
            const siblingWithTTMA = siblings.find((s: any) => s.taskTemplateModuleAttributes.length > 0);
            if (siblingWithTTMA) {
                mergedTTMAs = siblingWithTTMA.taskTemplateModuleAttributes;
            }
        }

        if (!hasTimeStudies) {
            const siblingWithTS = siblings.find((s: any) =>
                s.timeStudies.length > 0 && s.timeStudies.some((ts: any) => ts.clockTime && ts.clockTime > 0)
            );
            if (siblingWithTS) {
                mergedTimeStudies = siblingWithTS.timeStudies;
            }
        }

        // Build a synthetic task object with merged data
        const merged = {
            ...task,
            taskTemplate: {
                ...taskTemplate,
                taskTemplateModuleAttributes: mergedTTMAs,
                timeStudies: mergedTimeStudies
            }
        };

        return this.calculateForTask(merged);
    }

    /**
     * Calculate estimated hours for a single task (already fetched with includes).
     */
    private calculateForTask(task: any): number {
        const taskTemplate = task.taskTemplate;
        const traveler = task.traveler;

        // --- Validate required data exists ---
        if (!traveler?.moduleProfile) {
            throw new Error(`Traveler has no ModuleProfile`);
        }

        const moduleProfile = traveler.moduleProfile;

        if (!taskTemplate?.timeStudies || taskTemplate.timeStudies.length === 0) {
            throw new Error(`TaskTemplate "${taskTemplate?.id}" has no TimeStudy records`);
        }

        // --- Step 1: Module Profile attribute values ---
        // Map of moduleAttributeId -> numeric value
        const moduleAttrValues = new Map<string, number>();
        for (const mpma of moduleProfile.moduleProfileModuleAttributes) {
            const numVal = parseFloat(mpma.value);
            if (!isNaN(numVal)) {
                moduleAttrValues.set(mpma.moduleAttributeId, numVal);
            }
        }

        if (moduleAttrValues.size === 0) {
            throw new Error(`ModuleProfile "${moduleProfile.id}" has no numeric attributes`);
        }

        // --- Step 2: Task template relevant attribute IDs ---
        const relevantAttrIds = new Set<string>(
            taskTemplate.taskTemplateModuleAttributes.map((ttma: any) => ttma.moduleAttributeId)
        );

        if (relevantAttrIds.size === 0) {
            throw new Error(`TaskTemplate "${taskTemplate.id}" has no TaskTemplateModuleAttributes`);
        }

        // --- Step 3: Intersection (attributes that are both relevant AND have module values) ---
        const intersectedAttrIds: string[] = [];
        for (const attrId of relevantAttrIds) {
            if (moduleAttrValues.has(attrId)) {
                intersectedAttrIds.push(attrId);
            }
        }

        // --- Step 4: Pick the best Time Study (most recent with a date, or first available) ---
        // Find the first study with a valid clockTime
        const timeStudy = taskTemplate.timeStudies.find((ts: any) => ts.clockTime && ts.clockTime > 0)
            || taskTemplate.timeStudies[0];
        const clockTime = timeStudy?.clockTime;

        if (!clockTime || clockTime <= 0) {
            throw new Error(`TimeStudy "${timeStudy?.id}" has no valid clockTime`);
        }

        if (intersectedAttrIds.length === 0) {
            // No attribute overlap — use clockTime directly
            console.log(`[LaborEstimation] No attribute intersection — using clockTime directly: ${clockTime}h`);
            return Math.max(0.1, clockTime);
        }

        // --- Step 5: Time Study attribute values ---
        const timeStudyAttrValues = new Map<string, number>();
        for (const tsma of timeStudy.timeStudyModuleAttributes) {
            const numVal = parseFloat(tsma.value);
            if (!isNaN(numVal)) {
                timeStudyAttrValues.set(tsma.moduleAttributeId, numVal);
            }
        }

        // --- Step 6: Validate - every intersected attribute should exist in time study ---
        const validAttrIds: string[] = [];
        for (const attrId of intersectedAttrIds) {
            if (timeStudyAttrValues.has(attrId)) {
                validAttrIds.push(attrId);
            } else {
                console.warn(`[LaborEstimation] TimeStudy "${timeStudy.id}" missing attribute "${attrId}" — skipping this attribute`);
            }
        }

        if (validAttrIds.length === 0) {
            // Fallback: if no TSMA data exists but we have clockTime, use it directly.
            // This handles the common case where time studies only record clockTime/workerCount.
            console.log(`[LaborEstimation] No TSMA data — using clockTime directly: ${clockTime}h`);
            return Math.max(0.1, clockTime);
        }

        // --- Step 7: Proportional scaling with equal weighting ---
        let totalRatio = 0;
        for (const attrId of validAttrIds) {
            const moduleValue = moduleAttrValues.get(attrId)!;
            const timeStudyValue = timeStudyAttrValues.get(attrId)!;

            if (timeStudyValue === 0) {
                // Avoid division by zero — skip this attribute
                console.warn(`[LaborEstimation] TimeStudy attribute "${attrId}" has value 0, skipping`);
                continue;
            }

            const ratio = moduleValue / timeStudyValue;
            totalRatio += ratio;

            // Debug log
            const attrName = timeStudy.timeStudyModuleAttributes.find(
                (tsma: any) => tsma.moduleAttributeId === attrId
            )?.moduleAttribute?.name || attrId;
            console.log(`  [Attr] "${attrName}": module=${moduleValue}, study=${timeStudyValue}, ratio=${ratio.toFixed(3)}`);
        }

        const averageRatio = totalRatio / validAttrIds.length;

        // --- Step 8: Final estimate ---
        const estimatedHours = clockTime * averageRatio;

        console.log(`  [Result] clockTime=${clockTime}, avgRatio=${averageRatio.toFixed(3)}, estimate=${estimatedHours.toFixed(2)}h`);

        return Math.max(0.1, estimatedHours); // Floor at 0.1 hours (6 min)
    }

    /**
     * Convenience: estimate for a single task ID
     */
    async estimateForTask(taskId: string): Promise<number> {
        const results = await this.estimateLaborHours([taskId]);
        return results.get(taskId) || 1.0;
    }

    async disconnect() {
        await this.prisma.$disconnect();
    }
}
