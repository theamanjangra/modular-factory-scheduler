import { Task } from '../types';

export function computeEstimatedTotalLaborHours(task: Task): number | undefined {
    // Ensure necessary pieces exist
    const moduleAttrs = task.moduleAttributes;
    const templateAttrIds = task.taskTemplateAttributeIds;
    const timeStudy = task.timeStudy;

    if (!moduleAttrs || !templateAttrIds || !timeStudy) return undefined;

    // Build maps for quick lookup
    const moduleMap = new Map<string, number>(moduleAttrs.map(a => [a.attributeId, a.value] as [string, number]));
    const timeStudyMap = new Map<string, number>(timeStudy.attributes.map(a => [a.attributeId, a.value] as [string, number]));

    // Validate that time study attributes match the template attributes exactly
    for (const attrId of templateAttrIds) {
        if (!timeStudyMap.has(attrId) || !moduleMap.has(attrId)) {
            // Missing attribute -> cannot compute
            return undefined;
        }
    }

    // For each attribute, compute percentage change = (module - study) / study
    const pctChanges: number[] = [];
    for (const attrId of templateAttrIds) {
        const studyVal = timeStudyMap.get(attrId)!;
        const moduleVal = moduleMap.get(attrId)!;
        if (studyVal === 0) {
            // Avoid divide by zero; if studyVal is zero, fallback to absolute scaling
            // if both zero, treat as no change
            if (moduleVal === 0) {
                pctChanges.push(0);
            } else {
                // If study says zero and module > 0, we can't scale proportionally; bail
                return undefined;
            }
        } else {
            const pct = (moduleVal - studyVal) / studyVal; // e.g., +0.11 for +11%
            pctChanges.push(pct);
        }
    }

    // Equal weighting across attributes per spec
    const netPct = pctChanges.reduce((s, v) => s + v, 0) / (pctChanges.length || 1);

    const baseHours = timeStudy.totalLaborHours;
    let estimated = baseHours * (1 + netPct);

    // Apply manual adjustment if present
    if (typeof task.manualLaborHoursAdjustment === 'number') {
        estimated += task.manualLaborHoursAdjustment;
    }

    // Ensure non-negative
    if (estimated < 0) estimated = 0;

    return estimated;
}
