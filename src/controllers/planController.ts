import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PlanAdjustmentService } from '../services/planAdjustmentService';
import { v4 as uuidv4 } from 'uuid';
import {
    getProductionPlanWithAssignments,
    getWorkersWithShifts,
    getPendingTasks,
    getTaskProgressUpdates,
    getActiveTaskInterruptions,
    getActiveWorkerConstraints
} from '../queries/adjustPlan.query';
import type { TaskInterruptionWindow } from '../types';

const prisma = new PrismaClient();

/**
 * Request body — minimal, clean contract for the Swift client.
 * Everything else is fetched from the production DB (read-only).
 */
interface AdjustPlanRequest {
    taskUpdates: {
        taskId: string;
        laborHoursRemaining: number;
    }[];
    workerUpdates?: {
        workerId: string;
        startDate?: string | null;   // ISO 8601, optional
        endDate?: string | null;     // ISO 8601, optional
    }[];
    enforceDepartmentMatch?: boolean; // Default: true. When true, workers only assigned to same-department tasks.
}

/**
 * Response — diff format for the Swift client.
 */
interface AdjustPlanResponse {
    workerTasks: {
        added: {
            id: string;
            workerId: string;
            taskId: string | null;
            startDate: string;
            endDate: string;
        }[];
        updated: {
            id: string;
            workerId: string;
            taskId: string | null;
            startDate: string;
            endDate: string;
        }[];
        deleted: string[];
    };
    deficitTasks: {
        added: {
            id: string;
            task: {
                id: string;
                name?: string;
                description?: string;
            };
            deficitHours: number;
        }[];
        updated: {
            id: string;
            task: {
                id: string;
                name?: string;
                description?: string;
            };
            deficitHours: number;
        }[];
        deleted: string[];
    };
}

export class PlanController {
    private adjustmentService: PlanAdjustmentService;

    constructor() {
        this.adjustmentService = new PlanAdjustmentService();
    }

    /**
     * POST /api/v1/plans/adjust
     * 
     * Request: only taskUpdates + workerUpdates
     * Server fetches tasks, workers, assignments, shifts from production DB (read-only).
     */
    public adjustPlan = async (req: Request, res: Response) => {
        try {
            const body = req.body as AdjustPlanRequest;

            // ── Validation ──────────────────────────────────────
            if (!body || typeof body !== 'object') {
                res.status(400).json({ error: 'Request body is required.' });
                return;
            }
            if (!Array.isArray(body.taskUpdates)) {
                res.status(400).json({ error: 'taskUpdates must be an array.' });
                return;
            }
            for (const tu of body.taskUpdates) {
                if (!tu || typeof tu !== 'object') {
                    res.status(400).json({ error: 'Each taskUpdate must be an object.' });
                    return;
                }
                if (typeof tu.taskId !== 'string' || tu.taskId.trim() === '') {
                    res.status(400).json({ error: 'Each taskUpdate requires a taskId.' });
                    return;
                }
                if (typeof tu.laborHoursRemaining !== 'number' || tu.laborHoursRemaining < 0) {
                    res.status(400).json({ error: 'laborHoursRemaining must be a non-negative number.' });
                    return;
                }
            }
            if (body.workerUpdates && !Array.isArray(body.workerUpdates)) {
                res.status(400).json({ error: 'workerUpdates must be an array.' });
                return;
            }
            if (body.workerUpdates) {
                for (const wu of body.workerUpdates) {
                    if (!wu.workerId || typeof wu.workerId !== 'string') {
                        res.status(400).json({ error: 'Each workerUpdate requires a workerId.' });
                        return;
                    }
                }
            }

            // ── Fetch from Production DB (READ-ONLY) ────────────

            const currentTime = new Date().toISOString();
            console.log(`[AdjustPlan] Fetching data from production DB at ${currentTime}...`);

            // 1. Fetch Workers (with shift info for availability)
            const dbWorkers = await prisma.worker.findMany({
                include: {
                    shift: true,
                    workerDepartments: { include: { department: true } }
                }
            });

            const workers = dbWorkers.map(w => {
                const shiftStart = w.shift?.startTime;
                const shiftEnd = w.shift?.endTime;
                const primaryDept = w.workerDepartments?.find((wd: any) => wd.isLead) || w.workerDepartments?.[0];
                return {
                    workerId: w.id,
                    name: `${w.firstName || ''} ${w.lastName || ''}`.trim(),
                    departmentId: primaryDept?.department?.id || undefined,
                    availability: (shiftStart && shiftEnd) ? {
                        startTime: shiftStart.toISOString(),
                        endTime: shiftEnd.toISOString()
                    } : undefined
                };
            });

            // 2. Fetch Tasks (active: pending tasks from unshipped travelers)
            const travelers = await prisma.traveler.findMany({
                where: { isShipped: false },
                include: {
                    tasks: {
                        where: { leadStatus: 'pending' },
                        include: {
                            taskTemplate: {
                                include: {
                                    department: true,
                                    prerequisiteTaskTemplate: true
                                }
                            }
                        }
                    },
                    moduleProfile: true
                }
            });

            // Build prerequisite map: taskTemplateId → taskIds with that template
            const templateToTaskIds = new Map<string, string[]>();
            const tasks: any[] = [];

            for (const t of travelers) {
                for (const task of t.tasks) {
                    const tmpl = task.taskTemplate;
                    const taskId = task.id;

                    // Track template → task mapping for prerequisite resolution
                    if (!templateToTaskIds.has(tmpl.id)) {
                        templateToTaskIds.set(tmpl.id, []);
                    }
                    templateToTaskIds.get(tmpl.id)!.push(taskId);

                    tasks.push({
                        taskId: taskId,
                        name: `${tmpl.name}${t.moduleProfile?.name ? ' - ' + t.moduleProfile.name : ''}`,
                        departmentId: tmpl.departmentId || undefined,
                        description: tmpl.description || undefined,
                        estimatedTotalLaborHours: tmpl.nonWorkerTaskDuration || 4.0, // Default if no time study
                        maxWorkers: tmpl.maxWorkers ?? 100,
                        minWorkers: tmpl.minWorkers ?? 1,
                        taskType: tmpl.taskType || 'worker',
                        nonWorkerTaskDuration: tmpl.nonWorkerTaskDuration || undefined,
                        prerequisiteTaskTemplateId: tmpl.prerequisiteTaskTemplateId || undefined,
                        prerequisiteTaskIds: [] as string[]  // Will be resolved below
                    });
                }
            }

            // Resolve prerequisiteTaskIds from template relationships
            for (const task of tasks) {
                if (task.prerequisiteTaskTemplateId) {
                    const prereqTaskIds = templateToTaskIds.get(task.prerequisiteTaskTemplateId);
                    if (prereqTaskIds) {
                        task.prerequisiteTaskIds = prereqTaskIds;
                    }
                }
                delete task.prerequisiteTaskTemplateId;
            }

            // 3. Fetch existing WorkerTask assignments (original plan)
            const dbAssignments = await prisma.workerTask.findMany({
                include: {
                    task: {
                        include: {
                            taskTemplate: true
                        }
                    }
                }
            });

            const originalAssignments = dbAssignments.map(a => ({
                id: a.id,
                workerId: a.workerId,
                taskId: a.taskId,
                startDate: (a.scheduledStartDate || a.startDate || new Date()).toISOString(),
                endDate: (a.scheduledEndDate || a.endDate || new Date()).toISOString()
            }));

            console.log(`[AdjustPlan] Fetched ${workers.length} workers, ${tasks.length} tasks, ${originalAssignments.length} assignments.`);

            // ── Map to internal service format ──────────────────

            const internalUpdates = body.taskUpdates.map(tu => ({
                taskId: tu.taskId,
                laborHoursRemaining: tu.laborHoursRemaining,
                interpretAs: 'remaining' as const
            }));

            const internalWorkerUpdates = (body.workerUpdates || [])
                .filter(wu => wu.startDate || wu.endDate)
                .map(wu => ({
                    workerId: wu.workerId,
                    availability: {
                        startTime: wu.startDate || currentTime,
                        endTime: wu.endDate || '2099-12-31T23:59:59Z'
                    }
                }));

            const internalRequest = {
                currentTime,
                updates: internalUpdates,
                workerUpdates: internalWorkerUpdates.length > 0 ? internalWorkerUpdates : undefined,
                tasks,
                workers,
                originalAssignments,
                enforceDepartmentMatch: body.enforceDepartmentMatch !== false // Default: true
            };

            // ── Execute ─────────────────────────────────────────

            const result = await this.adjustmentService.adjustPlanReplan(
                originalAssignments,
                tasks,
                workers,
                internalRequest as any
            );

            const response = this.buildAdjustPlanResponse(result, originalAssignments, tasks);
            res.json(response);

        } catch (error: any) {
            console.error('[AdjustPlan] Error:', error);
            const status = typeof error?.statusCode === 'number'
                ? error.statusCode
                : (typeof error?.status === 'number' ? error.status : 500);
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    // ── Shared Response Builder ────────────────────────────

    private buildAdjustPlanResponse(
        result: any,
        originalAssignments: Array<{ id?: string; workerId: string; taskId: string; startDate: string; endDate: string }>,
        tasks: any[]
    ): AdjustPlanResponse {
        const origAssignmentIdMap = new Map<string, string>();
        originalAssignments.forEach(a => {
            if (a.id && a.workerId && a.taskId) {
                const key = `${a.workerId}|${a.taskId}|${new Date(a.startDate).toISOString()}`;
                origAssignmentIdMap.set(key, a.id);
            }
        });

        const taskNameMap = new Map<string, { name?: string; description?: string }>();
        tasks.forEach((t: any) => {
            taskNameMap.set(t.taskId, {
                name: t.name || undefined,
                description: t.description || undefined
            });
        });

        const addedWT = (result.addedWorkerTasks || []).map((a: any) => ({
            id: uuidv4(),
            workerId: a.workerId,
            taskId: a.taskId || null,
            startDate: a.startDate,
            endDate: a.endDate
        }));

        const updatedWT = (result.updatedWorkerTasks || []).map((a: any) => {
            const key = `${a.workerId}|${a.taskId}|${new Date(a.startDate).toISOString()}`;
            return {
                id: origAssignmentIdMap.get(key) || uuidv4(),
                workerId: a.workerId,
                taskId: a.taskId || null,
                startDate: a.startDate,
                endDate: a.endDate
            };
        });

        const deletedWT = (result.removedWorkerTasks || []).map((a: any) => {
            const key = `${a.workerId}|${a.taskId}|${new Date(a.startDate).toISOString()}`;
            return origAssignmentIdMap.get(key) || uuidv4();
        });

        const deficitAdded = (result.deficitTasks || []).map((d: any) => ({
            id: uuidv4(),
            task: {
                id: d.taskId,
                name: taskNameMap.get(d.taskId)?.name,
                description: taskNameMap.get(d.taskId)?.description
            },
            deficitHours: d.deficitHours
        }));

        return {
            workerTasks: {
                added: addedWT,
                updated: updatedWT,
                deleted: deletedWT
            },
            deficitTasks: {
                added: deficitAdded,
                updated: [],
                deleted: []
            }
        };
    }

    // ── Zero-Input Adjust Worker Tasks (Data Connect) ────

    /**
     * POST /api/v1/plans/:planId/worker-tasks/adjust
     *
     * Zero-input endpoint — only planId in URL.
     * Fetches ALL data from production DB via Data Connect (READ-ONLY).
     * Incorporates TaskProgressUpdates, TaskInterruptions, WorkerScheduleConstraints.
     */
    public adjustWorkerTasks = async (req: Request, res: Response) => {
        try {
            const rawPlanId = req.params.planId;
            const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId;
            if (!planId) {
                res.status(400).json({ error: 'planId is required in URL.' });
                return;
            }

            const currentTime = new Date().toISOString();
            console.log(`[AdjustWorkerTasks] planId=${planId}, fetching from Data Connect at ${currentTime}...`);

            // ── 1. Fetch ProductionPlan with shifts + workerTasks ──

            const plan = await getProductionPlanWithAssignments(planId);
            if (!plan) {
                res.status(404).json({ error: `ProductionPlan not found: ${planId}` });
                return;
            }

            // Extract original workerTask assignments from the plan's shifts
            const originalAssignments: Array<{ id: string; workerId: string; taskId: string; startDate: string; endDate: string }> = [];
            const planShifts = plan.productionPlanShifts_on_productionPlan || plan.productionPlanShifts || [];

            for (const pps of planShifts) {
                const wts = pps.workerTasks_on_productionPlanShift || pps.workerTasks || [];
                for (const wt of wts) {
                    if (!wt.worker?.id || !wt.task?.id) continue;
                    originalAssignments.push({
                        id: wt.id,
                        workerId: wt.worker.id,
                        taskId: wt.task.id,
                        startDate: wt.scheduledStartDate || wt.startDate || currentTime,
                        endDate: wt.scheduledEndDate || wt.endDate || currentTime
                    });
                }
            }

            // ── 2. Fetch Workers with shifts + departments ──────

            const dbWorkers = await getWorkersWithShifts();
            const workers = dbWorkers.map((w: any) => {
                const wdList = w.workerDepartments_on_worker || w.workerDepartments || [];
                const primaryWd = wdList.find((wd: any) => wd.isLead) || wdList[0];
                return {
                    workerId: w.id,
                    name: `${w.firstName || ''} ${w.lastName || ''}`.trim(),
                    departmentId: primaryWd?.department?.id || undefined,
                    availability: (w.shift?.startTime && w.shift?.endTime) ? {
                        startTime: w.shift.startTime,
                        endTime: w.shift.endTime
                    } : undefined
                };
            });

            // ── 3. Fetch Pending Tasks from unshipped travelers ─

            const travelers = await getPendingTasks();

            const templateToTaskIds = new Map<string, string[]>();
            const tasks: any[] = [];

            for (const t of travelers) {
                for (const task of (t.tasks || [])) {
                    const tmpl = task.taskTemplate;
                    if (!tmpl) continue;
                    const taskId = task.id;

                    if (!templateToTaskIds.has(tmpl.id)) {
                        templateToTaskIds.set(tmpl.id, []);
                    }
                    templateToTaskIds.get(tmpl.id)!.push(taskId);

                    tasks.push({
                        taskId,
                        name: `${tmpl.name || ''}${t.moduleProfile?.name ? ' - ' + t.moduleProfile.name : ''}`,
                        departmentId: tmpl.department?.id || undefined,
                        description: tmpl.description || undefined,
                        estimatedTotalLaborHours: tmpl.nonWorkerTaskDuration || 4.0,
                        maxWorkers: tmpl.maxWorkers ?? 100,
                        minWorkers: tmpl.minWorkers ?? 1,
                        taskType: tmpl.taskType || 'worker',
                        nonWorkerTaskDuration: tmpl.nonWorkerTaskDuration || undefined,
                        prerequisiteTaskTemplateId: tmpl.prerequisiteTaskTemplate?.id || undefined,
                        prerequisiteTaskIds: [] as string[]
                    });
                }
            }

            // Resolve prerequisiteTaskIds from template relationships
            for (const task of tasks) {
                if (task.prerequisiteTaskTemplateId) {
                    const prereqTaskIds = templateToTaskIds.get(task.prerequisiteTaskTemplateId);
                    if (prereqTaskIds) {
                        task.prerequisiteTaskIds = prereqTaskIds;
                    }
                }
                delete task.prerequisiteTaskTemplateId;
            }

            const taskIds = tasks.map((t: any) => t.taskId);
            const workerIds = workers.map((w: any) => w.workerId);

            console.log(`[AdjustWorkerTasks] Fetched ${workers.length} workers, ${tasks.length} tasks, ${originalAssignments.length} assignments.`);

            // ── 4. Compute Elapsed Time from Existing WorkerTask Intervals ─

            const now = Date.now();
            const elapsedByTask = new Map<string, number>();
            for (const a of originalAssignments) {
                const startMs = new Date(a.startDate).getTime();
                const endMs = a.endDate ? new Date(a.endDate).getTime() : now; // null endDate → use now()
                const elapsedHours = Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
                const current = elapsedByTask.get(a.taskId) || 0;
                elapsedByTask.set(a.taskId, current + elapsedHours);
            }

            // ── 5. Fetch TaskProgressUpdates ─────────────────────

            const progressUpdates = await getTaskProgressUpdates(taskIds);

            // Sum laborHoursAdjustment per task
            const progressByTask = new Map<string, number>();
            for (const pu of progressUpdates) {
                const tid = pu.task?.id;
                if (!tid) continue;
                const current = progressByTask.get(tid) || 0;
                progressByTask.set(tid, current + (pu.laborHoursAdjustment || 0));
            }

            // Build task updates per spec:
            //   Step 1: baseRemaining = max(0, estimatedTotalLaborHours - totalElapsedTime)
            //   Step 2: adjustedRemaining = max(0, baseRemaining + netLaborHoursAdjustment)
            const taskUpdates = tasks
                .filter((t: any) => elapsedByTask.has(t.taskId) || progressByTask.has(t.taskId))
                .map((t: any) => {
                    const estimated = t.estimatedTotalLaborHours || 0;
                    const totalElapsed = elapsedByTask.get(t.taskId) || 0;
                    const baseRemaining = Math.max(0, estimated - totalElapsed);
                    const netAdjustment = progressByTask.get(t.taskId) || 0;
                    const adjustedRemaining = Math.max(0, baseRemaining + netAdjustment);
                    return {
                        taskId: t.taskId,
                        laborHoursRemaining: adjustedRemaining,
                        interpretAs: 'remaining' as const
                    };
                });

            // ── 6. Fetch Active TaskInterruptions ────────────────

            const dbInterruptions = await getActiveTaskInterruptions(taskIds);

            const taskInterruptionWindows: TaskInterruptionWindow[] = dbInterruptions.map((ti: any) => ({
                taskId: ti.task?.id,
                startDate: ti.startDate,
                endDate: ti.endDate || undefined,
                maxWorkersDuringInterruption: ti.maxWorkersDuringInterruption ?? 0
            })).filter((w: TaskInterruptionWindow) => w.taskId);

            // ── 7. Fetch Active WorkerScheduleConstraints ────────

            const dbConstraints = await getActiveWorkerConstraints(workerIds);

            // Subtract constraint windows from worker availability
            for (const w of workers) {
                const constraints = dbConstraints.filter((c: any) => c.worker?.id === w.workerId);
                if (constraints.length === 0 || !w.availability) continue;

                const baseAvail = Array.isArray(w.availability) ? w.availability : [w.availability];
                const subtracted = subtractConstraintWindows(baseAvail, constraints);
                (w as any).availability = subtracted;
            }

            console.log(`[AdjustWorkerTasks] ${taskUpdates.length} task updates, ${taskInterruptionWindows.length} interruptions, ${dbConstraints.length} worker constraints.`);

            // ── 8. Execute Replan ────────────────────────────────

            const internalRequest = {
                currentTime,
                updates: taskUpdates,
                tasks,
                workers,
                originalAssignments,
                enforceDepartmentMatch: true,
                taskInterruptionWindows
            };

            const result = await this.adjustmentService.adjustPlanReplan(
                originalAssignments,
                tasks,
                workers,
                internalRequest as any
            );

            // ── 9. Build Response ────────────────────────────────

            const response = this.buildAdjustPlanResponse(result, originalAssignments, tasks);
            res.json(response);

        } catch (error: any) {
            console.error('[AdjustWorkerTasks] Error:', error);
            const status = typeof error?.statusCode === 'number'
                ? error.statusCode
                : (typeof error?.status === 'number' ? error.status : 500);
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    public getPlan = async (req: Request, res: Response) => {
        try {
            const rawPlanId = req.params.planId;
            const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId;

            if (!planId) {
                res.status(400).json({ error: 'planId is required.' });
                return;
            }

            const { getPlanWithSnapshot } = await import('../models/planModel');
            const plan = await getPlanWithSnapshot(planId);

            if (!plan) {
                res.status(404).json({ error: 'Plan not found' });
                return;
            }

            res.json(plan);
        } catch (error: any) {
            console.error('Get plan error:', error);
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    };
}

// ── Helper: Subtract constraint windows from availability intervals ──────

function subtractConstraintWindows(
    availability: Array<{ startTime: string; endTime: string }>,
    constraints: Array<{ startDate: string; endDate?: string }>
): Array<{ startTime: string; endTime: string }> {
    let intervals = availability.map(a => ({
        start: new Date(a.startTime).getTime(),
        end: new Date(a.endTime).getTime()
    }));

    for (const c of constraints) {
        const cStart = new Date(c.startDate).getTime();
        const cEnd = c.endDate ? new Date(c.endDate).getTime() : Number.MAX_SAFE_INTEGER;

        const newIntervals: typeof intervals = [];
        for (const iv of intervals) {
            if (cEnd <= iv.start || cStart >= iv.end) {
                // No overlap
                newIntervals.push(iv);
            } else {
                // Overlap — split
                if (cStart > iv.start) {
                    newIntervals.push({ start: iv.start, end: cStart });
                }
                if (cEnd < iv.end) {
                    newIntervals.push({ start: cEnd, end: iv.end });
                }
            }
        }
        intervals = newIntervals;
    }

    return intervals
        .filter(iv => iv.end > iv.start)
        .map(iv => ({
            startTime: new Date(iv.start).toISOString(),
            endTime: new Date(iv.end).toISOString()
        }));
}
