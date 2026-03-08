/**
 * Data Connect GraphQL queries for the zero-input adjustPlan endpoint.
 * All queries are READ-ONLY — we never write to the production DB.
 *
 * NOTE: We use nested object access (e.g., department { id }) instead of
 * FK scalar fields (e.g., departmentId) because nested access is guaranteed
 * to work in Data Connect GraphQL.
 */
import { dataConnect } from '../config/dataConnectClient';

// ─── 1. Fetch ProductionPlan with shifts and their workerTasks ───────────────

export async function getProductionPlanWithAssignments(planId: string) {
    const query = `
        query GetProductionPlan($id: UUID!) {
            productionPlan(id: $id) {
                id
                startDate
                dueDate
                productionPlanShifts_on_productionPlan {
                    id
                    shareOfWork
                    isStartingShift
                    isEndingShift
                    shift {
                        id
                        startTime
                        endTime
                    }
                    workerTasks_on_productionPlanShift {
                        id
                        worker {
                            id
                            firstName
                            lastName
                        }
                        task {
                            id
                            taskTemplate {
                                id
                                name
                                department { id }
                                minWorkers
                                maxWorkers
                                taskType
                                nonWorkerTaskDuration
                                prerequisiteTaskTemplate { id }
                                description
                            }
                        }
                        startDate
                        endDate
                        scheduledStartDate
                        scheduledEndDate
                        assignmentType
                    }
                }
            }
        }
    `;
    const result = await dataConnect.executeGraphql(query, { variables: { id: planId } });
    return (result as any).data?.productionPlan ?? null;
}

// ─── 2. Fetch workers with shift + departments ──────────────────────────────

export async function getWorkersWithShifts() {
    const query = `
        query GetWorkers {
            workers {
                id
                firstName
                lastName
                shift {
                    id
                    startTime
                    endTime
                }
                workerDepartments_on_worker {
                    department {
                        id
                    }
                    isLead
                }
                workerTaskTemplates_on_worker {
                    preference
                    taskTemplate {
                        id
                        name
                    }
                }
                rankedSkills
            }
        }
    `;
    const result = await dataConnect.executeGraphql(query);
    return (result as any).data?.workers ?? [];
}

// ─── 3. Fetch pending tasks from unshipped travelers ─────────────────────────

export async function getPendingTasks() {
    const query = `
        query GetPendingTasks {
            travelers(where: { isShipped: { eq: false } }) {
                id
                moduleProfile {
                    id
                    name
                }
                tasks_on_traveler(where: { leadStatus: { eq: "pending" } }) {
                    id
                    taskTemplate {
                        id
                        name
                        department { id }
                        minWorkers
                        maxWorkers
                        taskType
                        nonWorkerTaskDuration
                        prerequisiteTaskTemplate { id }
                        description
                    }
                }
            }
        }
    `;
    const result = await dataConnect.executeGraphql(query);
    return (result as any).data?.travelers ?? [];
}

// ─── 4. Fetch TaskProgressUpdates for given task IDs ─────────────────────────

export async function getTaskProgressUpdates(taskIds: string[]) {
    if (taskIds.length === 0) return [];

    // Data Connect may not support `_in` filters directly — fetch all and filter client-side
    const query = `
        query GetTaskProgressUpdates {
            taskProgressUpdates {
                id
                task { id }
                laborHoursAdjustment
                timeAdjustment
                scheduleDate
                updateDate
            }
        }
    `;
    const result = await dataConnect.executeGraphql(query);
    const all = (result as any).data?.taskProgressUpdates ?? [];
    const normalize = (id: string) => id?.toLowerCase().replace(/-/g, '');
    const taskIdSet = new Set(taskIds.map(normalize));
    return all.filter((tpu: any) => taskIdSet.has(normalize(tpu.task?.id)));
}

// ─── 5. Fetch active TaskInterruptions ───────────────────────────────────────

export async function getActiveTaskInterruptions(taskIds: string[]) {
    if (taskIds.length === 0) return [];

    const query = `
        query GetTaskInterruptions {
            taskInterruptions {
                id
                task { id }
                startDate
                endDate
                maxWorkersDuringInterruption
                reason
            }
        }
    `;
    const result = await dataConnect.executeGraphql(query);
    const all = (result as any).data?.taskInterruptions ?? [];
    const normalize = (id: string) => id?.toLowerCase().replace(/-/g, '');
    const taskIdSet = new Set(taskIds.map(normalize));
    const now = Date.now();

    // Filter: belongs to our tasks AND is currently active (no endDate or endDate in future)
    return all.filter((ti: any) => {
        if (!taskIdSet.has(normalize(ti.task?.id))) return false;
        if (ti.endDate && new Date(ti.endDate).getTime() < now) return false;
        return true;
    });
}

// ─── 6. Fetch tasks with labor estimation data (TimeStudies + Module Attributes) ─

export async function getTasksWithEstimationData(taskIds: string[]) {
    if (taskIds.length === 0) return [];

    // Data Connect may not support `_in` filters — fetch all and filter client-side
    // Use limit to ensure we get all tasks (DC may have a default row cap)
    const query = `
        query GetTasksForEstimation {
            tasks(limit: 10000) {
                id
                estimatedLaborHours
                taskTemplate {
                    id
                    name
                    department { id }
                    nonWorkerTaskDuration
                    prerequisiteTaskTemplate { id }
                    minWorkers
                    maxWorkers
                    taskType
                    rankedSkills
                }
                traveler {
                    id
                }
            }
        }
    `;
    let result: any;
    try {
        result = await dataConnect.executeGraphql(query);
    } catch (err: any) {
        console.error(`[getTasksWithEstimationData] GraphQL query FAILED:`, err?.message || err);
        // If the query fails (e.g. estimatedLaborHours not in schema yet),
        // retry without that field so we still get task metadata
        console.log(`[getTasksWithEstimationData] Retrying without estimatedLaborHours...`);
        const fallbackQuery = `
            query GetTasksForEstimation {
                tasks(limit: 10000) {
                    id
                    taskTemplate {
                        id
                        name
                        department { id }
                        nonWorkerTaskDuration
                        prerequisiteTaskTemplate { id }
                        minWorkers
                        maxWorkers
                        taskType
                        rankedSkills
                    }
                    traveler { id }
                }
            }
        `;
        result = await dataConnect.executeGraphql(fallbackQuery);
    }

    const all = (result as any).data?.tasks ?? [];
    // Normalize UUIDs: DB may store lowercase without dashes, input may be uppercase with dashes
    const normalize = (id: string) => id?.toLowerCase().replace(/-/g, '');
    const taskIdSet = new Set(taskIds.map(normalize));
    const matched = all.filter((t: any) => taskIdSet.has(normalize(t.id)));

    // Diagnostic: help debug missing tasks
    const unmatchedIds = taskIds.filter(id => !matched.some((t: any) => normalize(t.id) === normalize(id)));
    console.log(`[getTasksWithEstimationData] DC returned ${all.length} total tasks, matched ${matched.length}/${taskIds.length} input IDs`);
    if (unmatchedIds.length > 0) {
        console.log(`[getTasksWithEstimationData] Unmatched input IDs: ${unmatchedIds.join(', ')}`);
    }
    // Log a sample to see if estimatedLaborHours is present
    if (matched.length > 0) {
        const sample = matched[0];
        console.log(`[getTasksWithEstimationData] Sample task fields: id=${sample.id?.slice(0,8)}, estimatedLaborHours=${sample.estimatedLaborHours}, nonWorkerTaskDuration=${sample.taskTemplate?.nonWorkerTaskDuration}`);
    }

    return matched;
}

// ─── 6b. TEMP DEBUG: Fetch sample task IDs from Data Connect ─────────────────
export async function getAllTaskIdsSample(limit: number = 5) {
    const query = `query { tasks { id taskTemplate { name department { id } minWorkers maxWorkers } } }`;
    const result = await dataConnect.executeGraphql(query);
    const all = (result as any).data?.tasks ?? [];
    return all.slice(0, limit).map((t: any) => ({
        id: t.id,
        name: t.taskTemplate?.name,
        deptId: t.taskTemplate?.department?.id,
        minW: t.taskTemplate?.minWorkers,
        maxW: t.taskTemplate?.maxWorkers
    }));
}

// ─── 7. Fetch active WorkerScheduleConstraints ──────────────────────────────

export async function getActiveWorkerConstraints(workerIds: string[]) {
    if (workerIds.length === 0) return [];

    try {
        const query = `
            query GetWorkerScheduleConstraints {
                workerScheduleConstraints {
                    id
                    worker { id }
                    startDate
                    endDate
                    reason
                }
            }
        `;
        const result = await dataConnect.executeGraphql(query);
        const all = (result as any).data?.workerScheduleConstraints ?? [];
        const normalize = (id: string) => id?.toLowerCase().replace(/-/g, '');
        const workerIdSet = new Set(workerIds.map(normalize));
        const now = Date.now();

        return all.filter((wsc: any) => {
            if (!workerIdSet.has(normalize(wsc.worker?.id))) return false;
            if (wsc.endDate && new Date(wsc.endDate).getTime() < now) return false;
            return true;
        });
    } catch (error) {
        // WorkerScheduleConstraint model does NOT exist in production schema yet
        console.warn('[adjustPlan.query] WorkerScheduleConstraints query failed (model does not exist in schema):', error);
        return [];
    }
}

/**
 * Fetch worker IDs that are currently clocked in (active TimeLog entry).
 * A worker is "clocked in" if officialClockInDate has a value and officialClockOutDate is NULL.
 * Returns a Set of normalized (lowercase, no dashes) worker IDs.
 * Returns empty Set on failure (graceful degradation = no attendance filtering).
 */
export async function getClockedInWorkerIds(): Promise<Set<string>> {
    try {
        const query = `
            query GetTimeLogs {
                timeLogs {
                    worker { id }
                    officialClockInDate
                    officialClockOutDate
                }
            }
        `;
        const result = await dataConnect.executeGraphql(query);
        const all = (result as any).data?.timeLogs ?? [];
        const normalize = (id: string) => id?.toLowerCase().replace(/-/g, '');

        const clockedIn = new Set<string>();
        for (const entry of all) {
            if (entry.officialClockInDate && !entry.officialClockOutDate) {
                const wId = entry.worker?.id;
                if (wId) clockedIn.add(normalize(wId));
            }
        }

        console.log(`[adjustPlan.query] Found ${clockedIn.size} clocked-in workers from ${all.length} TimeLog entries`);
        return clockedIn;
    } catch (error) {
        console.warn('[adjustPlan.query] TimeLogs query failed:', error);
        return new Set<string>();
    }
}
