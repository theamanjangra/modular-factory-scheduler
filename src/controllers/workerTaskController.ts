import { Request, Response } from 'express'; // Ensure express types are installed
import { PlanningService } from '../services/planningService';
import { PlanRequest, MultiShiftPlanRequest, SkillMatchingRequest, AdjustPlanSimpleRequest, SchedulingConfig } from '../types';
import { MultiShiftPlanningService } from '../services/multiShiftPlanningService';
import { MultiShiftFilePlanningService } from '../services/multiShiftFilePlanningService';
import { SkillMatchingService } from '../services/skillMatchingService';
import { parseExcelData } from '../utils/excelLoader';
import { aggregateSchedule, mergeConsecutiveItems } from '../utils/scheduleAggregator';
import { VerificationService } from '../services/verificationService';
import { PlanAdjustmentService } from '../services/planAdjustmentService';
import { generateResultsExcel, generateMultiShiftResultsExcel, MultiShiftExcelData } from '../utils/excelGenerator';
import { loadSkilledWorkers, loadCrossDeptTasks, loadStationTemplateMap } from '../utils/stationDepartmentLoader';
import { taskInterruptionService } from '../services/taskInterruptionService';
import { CreateInterruptionRequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/db'; // Import Prisma Client

export class WorkerTaskController {
    private planningService: PlanningService;
    private multiShiftPlanningService: MultiShiftPlanningService;
    private multiShiftFilePlanningService: MultiShiftFilePlanningService;
    private skillMatchingService: SkillMatchingService;
    private planAdjustmentService: PlanAdjustmentService;
    // taskInterruptionService is a singleton, no need to store it

    constructor() {
        this.planningService = new PlanningService();
        this.multiShiftPlanningService = new MultiShiftPlanningService();
        this.multiShiftFilePlanningService = new MultiShiftFilePlanningService();
        this.skillMatchingService = new SkillMatchingService();
        this.planAdjustmentService = new PlanAdjustmentService();
        // taskInterruptionService is already instantiated as a singleton
    }

    public plan = async (req: Request, res: Response) => {
        try {
            const body = req.body as PlanRequest;
            const rawSteps = this.planningService.plan(body);
            const aggregated = aggregateSchedule(rawSteps);

            res.json({
                version: "v2-god-mode",
                ...aggregated,
                assignments: aggregated.story, // V2: Mixed list of Assignments and Comments
                items: aggregated.assignments  // Backup: Pure assignments
            });
        } catch (error) {
            console.error(error);
            const status = (error as any)?.statusCode || (error as any)?.status || 500;
            res.status(status).json({ error: (error as any)?.message || 'Internal Server Error' });
        }
    };

    public planFromFile = async (req: Request, res: Response) => {
        try {
            const file = req.file;
            if (!file) {
                res.status(400).send("No file uploaded.");
                return;
            }

            // Parse File
            const { workers, tasks } = parseExcelData(file.buffer);

            // Get Interval from Form Data or Default
            const startTime = req.body.startTime || "2024-01-01T07:00:00Z";
            const endTime = req.body.endTime || "2024-01-01T17:00:00Z";

            const requestData: PlanRequest = {
                workers,
                tasks,
                interval: { startTime, endTime },
                useHistorical: false,
                scheduling: this.parseSchedulingConfig(req.body)
            };

            console.log("Plan From File Request:", `${workers.length} workers, ${tasks.length} tasks`);

            const planningService = new PlanningService();
            // Note: Service usually loads preferences from local CSV.
            // But excelLoader populates 'worker.preferences' which takes precedence in getWorkerPreference()!
            // So logic is preserved.

            const rawSteps = planningService.plan(requestData);
            const aggregated = aggregateSchedule(rawSteps);

            // Return both assignments and task definitions for UI visualization
            res.json({
                version: "v2-god-mode",
                ...aggregated,
                assignments: aggregated.story, // V2: Mixed list
                items: aggregated.assignments, // Backward compatibility
                tasks,
                workers
            });

        } catch (error) {
            console.error("Planning File Error:", error);
            const status = (error as any)?.statusCode || (error as any)?.status || 500;
            res.status(status).send((error as any)?.message || "Internal Server Error");
        }
    };
    public planMultiShiftFromFile = async (req: Request, res: Response) => {
        try {
            const file = req.file;
            if (!file) {
                res.status(400).send("No file uploaded.");
                return;
            }

            const { workers, tasks } = parseExcelData(file.buffer);

            const startTime = req.body.startTime || "2024-01-01T07:00:00Z";
            const endTime = req.body.endTime || "2024-01-01T17:00:00Z";
            const shift1StartTime = req.body.shift1StartTime || startTime;
            const shift1EndTime = req.body.shift1EndTime || endTime;
            const shift2StartTime = req.body.shift2StartTime;
            let shift2EndTime = req.body.shift2EndTime;
            const startingShiftPct = parseFloat(req.body.startingShiftPct);
            const endingShiftPct = req.body.endingShiftPct !== undefined ? parseFloat(req.body.endingShiftPct) : undefined;

            // If shift 2 is provided and sits on the same day as shift 1, push it to the next day by default
            const normalizeToNextDayIfSame = (s1: string, s2?: string, e2?: string) => {
                if (!s2 || !e2) return { s2, e2 };
                const d1 = new Date(s1);
                const ds2 = new Date(s2);
                const de2 = new Date(e2);
                const sameDay =
                    d1.getUTCFullYear() === ds2.getUTCFullYear() &&
                    d1.getUTCMonth() === ds2.getUTCMonth() &&
                    d1.getUTCDate() === ds2.getUTCDate();
                if (!sameDay) return { s2, e2 };
                const addDay = (d: Date) => {
                    const nd = new Date(d);
                    nd.setUTCDate(nd.getUTCDate() + 1);
                    return nd.toISOString();
                };
                return { s2: addDay(ds2), e2: addDay(de2) };
            };

            let shift2StartIso = shift2StartTime;
            let shift2EndIso = shift2EndTime;
            if (shift2StartTime && shift2EndTime) {
                const bumped = normalizeToNextDayIfSame(shift1StartTime, shift2StartTime, shift2EndTime || shift2StartTime);
                shift2StartIso = bumped.s2;
                shift2EndIso = bumped.e2;
            }

            const requestBody = {
                startTime,
                endTime,
                startingShiftPct,
                endingShiftPct,
                shift1Interval: { startTime: shift1StartTime, endTime: shift1EndTime },
                shift2Interval: shift2StartIso && shift2EndIso ? { startTime: shift2StartIso, endTime: shift2EndIso } : undefined,
                tasks,
                workers,
                scheduling: this.parseSchedulingConfig(req.body)
            };

            const result = await this.multiShiftFilePlanningService.plan(requestBody as any);

            res.json({
                version: "multi-shift-file",
                ...result,
                tasks,
                workers
            });
        } catch (error: any) {
            const status = error?.statusCode || error?.status || 500;
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };
    public exportPlan = async (req: Request, res: Response) => {
        try {
            const body = req.body as PlanRequest;
            // 1. Run Simulation
            const rawSteps = this.planningService.plan(body);
            const aggregated = aggregateSchedule(rawSteps);
            const result = {
                ...aggregated,
                items: aggregated.assignments
            };

            // 2. Validate
            const verifier = new VerificationService();
            const report = verifier.validateSchedule(result, body.workers, body.tasks);

            // 3. Generate Excel
            const buffer = generateResultsExcel(result, body.tasks, report);

            // 4. Return File
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=simulation_results.xlsx');
            res.send(buffer);

        } catch (error) {
            console.error(error);
            const status = (error as any)?.statusCode || (error as any)?.status || 500;
            res.status(status).json({ error: (error as any)?.message || 'Internal Server Error' });
        }
    };

    public exportPlanFromFile = async (req: Request, res: Response) => {
        try {
            const file = req.file;
            if (!file) {
                res.status(400).send("No file uploaded.");
                return;
            }

            // Parse
            const { workers, tasks } = parseExcelData(file.buffer);
            const startTime = req.body.startTime || "2024-01-01T07:00:00Z";
            const endTime = req.body.endTime || "2024-01-01T17:00:00Z";

            const body: PlanRequest = {
                workers,
                tasks,
                interval: { startTime, endTime },
                useHistorical: false,
                scheduling: this.parseSchedulingConfig(req.body)
            };

            // 1. Run Simulation
            const rawSteps = this.planningService.plan(body);
            const aggregated = aggregateSchedule(rawSteps);
            const result = {
                ...aggregated,
                items: aggregated.assignments
            };

            // 2. Validate
            const verifier = new VerificationService();
            const report = verifier.validateSchedule(result, body.workers, body.tasks);

            // 3. Generate Excel
            const buffer = generateResultsExcel(result, body.tasks, report);

            // 4. Return File
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=simulation_results.xlsx');
            res.send(buffer);

        } catch (error) {
            console.error(error);
            const status = (error as any)?.statusCode || (error as any)?.status || 500;
            res.status(status).json({ error: (error as any)?.message || 'Internal Server Error' });
        }
    };

    public multiShiftPlan = async (req: Request, res: Response) => {
        try {
            const body = req.body as MultiShiftPlanRequest;
            const result = await this.multiShiftPlanningService.plan(body);
            res.json(result);
        } catch (error: any) {
            const status = error?.statusCode || error?.status || 500;
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    public planMultiShiftFromFileWithShiftIds = async (req: Request, res: Response) => {
        try {
            const file = req.file;
            if (!file) {
                res.status(400).send("No file uploaded.");
                return;
            }

            const { workers, tasks } = parseExcelData(file.buffer);

            const startTime = req.body.startTime || "2024-01-01T07:00:00Z";
            const endTime = req.body.endTime || "2024-01-01T17:00:00Z";
            const shift1StartTime = req.body.shift1StartTime || startTime;
            const shift1EndTime = req.body.shift1EndTime || endTime;
            const shift2StartTime = req.body.shift2StartTime;
            const shift2EndTime = req.body.shift2EndTime;
            const startingShiftPct = parseFloat(req.body.startingShiftPct);
            const endingShiftPct = req.body.endingShiftPct !== undefined ? parseFloat(req.body.endingShiftPct) : undefined;

            if (isNaN(startingShiftPct)) {
                res.status(400).send("startingShiftPct is required and must be a number.");
                return;
            }

            const requestBody = {
                startTime,
                endTime,
                startingShiftPct,
                endingShiftPct,
                shift1Interval: { startTime: shift1StartTime, endTime: shift1EndTime },
                shift2Interval: shift2StartTime && shift2EndTime ? { startTime: shift2StartTime, endTime: shift2EndTime } : undefined,
                tasks,
                workers,
                scheduling: this.parseSchedulingConfig(req.body)
            };

            const result = await this.multiShiftFilePlanningService.plan(requestBody as any);

            // Calculate taskProgress manually to ensure it's sent to frontend
            const getDateKey = (dateStr: string) => dateStr.split('T')[0];
            const shift1Date = getDateKey(shift1StartTime);
            const shift2Date = shift2StartTime ? getDateKey(shift2StartTime) : undefined;

            const taskProgress = tasks.map(task => {
                const shift1TaskAssignments = result.assignments.filter(a =>
                    a.taskId === task.taskId && getDateKey(a.startDate) === shift1Date
                );
                const shift2TaskAssignments = shift2Date ? result.assignments.filter(a =>
                    a.taskId === task.taskId && getDateKey(a.startDate) === shift2Date
                ) : [];

                const shift1Hours = shift1TaskAssignments.reduce((total, a) => {
                    return total + (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
                }, 0);
                const shift2Hours = shift2TaskAssignments.reduce((total, a) => {
                    return total + (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
                }, 0);

                const totalRequired = task.estimatedTotalLaborHours || 0;
                const totalWorked = shift1Hours + shift2Hours;
                const completionPct = totalRequired > 0 ? Math.min(100, (totalWorked / totalRequired) * 100) : 0;

                return {
                    taskId: task.taskId,
                    taskName: task.name,
                    shift1Hours,
                    shift2Hours,
                    totalRequiredHours: totalRequired,
                    completionPercentage: completionPct,
                    completedInShift: completionPct >= 100
                        ? (shift1Hours >= totalRequired ? 'shift1' : 'shift2')
                        : (shift1Hours > 0 && shift2Hours > 0 ? 'spans_shifts' : 'incomplete'),
                    shiftCompletionPreference: task.shiftCompletionPreference
                };
            });

            // --- PERSISTENCE LAYER ---
            let planId: string | undefined;
            try {
                // Save Payload + Assignments
                const savedPlan = await prisma.plan.create({
                    data: {
                        name: `MultiShift Import ${new Date().toISOString()}`,
                        inputSnapshot: requestBody as any, // Save full input
                        assignments: {
                            create: result.assignments
                                .filter(a => (a.workerId && a.taskId) || (a as any).isWaitTask) // Allow wait tasks without worker
                                .map(a => ({
                                    workerId: a.workerId || 'GAP_VIRTUAL_WORKER', // Placeholder for gap
                                    taskId: a.taskId || 'unknown',
                                    shiftId: 'unknown',
                                    startTime: new Date(a.startDate),
                                    endTime: new Date(a.endDate)
                                }))
                        }
                    }
                });
                planId = savedPlan.id;
                console.log(`[Persistence] Saved Plan ID: ${planId}`);
            } catch (dbError) {
                console.error("[Persistence] Failed to save plan to DB:", dbError);
                // Non-blocking failure - use ephemeral planId so frontend can still use Hold/Resume
                planId = 'ephemeral';
            }

            // FIX: Merge consecutive blocks for UI display
            // The frontend Gantt chart renders what we send here.
            // If we send 5-min blocks, it renders 5-min blocks.
            // We must merge them.
            const mergedAssignments = mergeConsecutiveItems(result.assignments);
            const mergedIdle = mergeConsecutiveItems(result.idleWorkers.map(u => ({ ...u, taskId: 'IDLE' })));

            res.json({
                version: "multi-shift-manual-ignored-shiftids",
                planId, // Return ID to client
                ...result,
                assignments: mergedAssignments, // OVERRIDE with merged
                idleWorkers: mergedIdle,        // OVERRIDE with merged
                taskProgress,
                tasks,
                workers
            });
        } catch (error: any) {
            const status = error?.statusCode || error?.status || 500;
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    /**
     * Multi-Shift Excel Export: Generates an Excel file with separate sheets per shift
     * showing assignments, completion percentages, and split verification.
     */
    public exportMultiShiftFromFile = async (req: Request, res: Response) => {
        try {
            const file = req.file;
            if (!file) {
                res.status(400).send("No file uploaded.");
                return;
            }

            const { workers, tasks } = parseExcelData(file.buffer);

            const startTime = req.body.startTime || "2024-01-01T07:00:00Z";
            const endTime = req.body.endTime || "2024-01-01T17:00:00Z";
            const shift1StartTime = req.body.shift1StartTime || startTime;
            const shift1EndTime = req.body.shift1EndTime || endTime;
            const shift2StartTime = req.body.shift2StartTime;
            const shift2EndTime = req.body.shift2EndTime;
            const startingShiftPct = parseFloat(req.body.startingShiftPct);
            const endingShiftPct = req.body.endingShiftPct !== undefined
                ? parseFloat(req.body.endingShiftPct)
                : (1 - startingShiftPct);

            if (isNaN(startingShiftPct)) {
                res.status(400).send("startingShiftPct is required and must be a number.");
                return;
            }

            const requestBody = {
                startTime,
                endTime,
                startingShiftPct,
                endingShiftPct,
                shift1Interval: { startTime: shift1StartTime, endTime: shift1EndTime },
                shift2Interval: shift2StartTime && shift2EndTime
                    ? { startTime: shift2StartTime, endTime: shift2EndTime }
                    : undefined,
                tasks,
                workers,
                scheduling: this.parseSchedulingConfig(req.body)
            };

            // Run multi-shift planning
            const result = await this.multiShiftFilePlanningService.plan(requestBody as any);

            // Extract dates from shift intervals
            const getDateKey = (dateStr: string) => dateStr.split('T')[0];
            const shift1Date = getDateKey(shift1StartTime);
            const shift2Date = shift2StartTime ? getDateKey(shift2StartTime) : undefined;

            // Calculate shift summaries from assignments
            const calcShiftSummary = (shiftDate: string, shiftId: string) => {
                const shiftAssignments = result.assignments.filter(a =>
                    getDateKey(a.startDate) === shiftDate
                );
                const hoursWorked = shiftAssignments.reduce((total, a) => {
                    const dur = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
                    return total + dur;
                }, 0);
                const taskHours = new Map<string, number>();
                shiftAssignments.forEach(a => {
                    if (a.taskId) {
                        const dur = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
                        taskHours.set(a.taskId, (taskHours.get(a.taskId) || 0) + dur);
                    }
                });
                const tasksWorkedOn = Array.from(taskHours.keys());
                return {
                    shiftId,
                    totalHoursWorked: hoursWorked,
                    tasksCompleted: tasksWorkedOn.filter(tid => {
                        const task = tasks.find(t => t.taskId === tid);
                        const worked = taskHours.get(tid) || 0;
                        return task && task.estimatedTotalLaborHours && worked >= task.estimatedTotalLaborHours;
                    }),
                    tasksInProgress: tasksWorkedOn.filter(tid => {
                        const task = tasks.find(t => t.taskId === tid);
                        const worked = taskHours.get(tid) || 0;
                        return task && task.estimatedTotalLaborHours && worked < task.estimatedTotalLaborHours;
                    }),
                    productionRate: hoursWorked > 0 ? tasksWorkedOn.length / hoursWorked : 0
                };
            };

            const shift1Summary = calcShiftSummary(shift1Date, 'shift-1');
            const shift2Summary = shift2Date ? calcShiftSummary(shift2Date, 'shift-2') : undefined;

            // Calculate taskProgress from assignments if not provided
            const taskProgress = result.taskProgress || tasks.map(task => {
                const shift1TaskAssignments = result.assignments.filter(a =>
                    a.taskId === task.taskId && getDateKey(a.startDate) === shift1Date
                );
                const shift2TaskAssignments = shift2Date ? result.assignments.filter(a =>
                    a.taskId === task.taskId && getDateKey(a.startDate) === shift2Date
                ) : [];

                const shift1Hours = shift1TaskAssignments.reduce((total, a) => {
                    return total + (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
                }, 0);
                const shift2Hours = shift2TaskAssignments.reduce((total, a) => {
                    return total + (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
                }, 0);

                const totalRequired = task.estimatedTotalLaborHours || 0;
                const totalWorked = shift1Hours + shift2Hours;
                const completionPct = totalRequired > 0 ? Math.min(100, (totalWorked / totalRequired) * 100) : 0;

                return {
                    taskId: task.taskId,
                    taskName: task.name,
                    shift1Hours,
                    shift2Hours,
                    totalRequiredHours: totalRequired,
                    completionPercentage: completionPct,
                    completedInShift: completionPct >= 100
                        ? (shift1Hours >= totalRequired ? 'shift1' : 'shift2')
                        : (shift1Hours > 0 && shift2Hours > 0 ? 'spans_shifts' : 'incomplete'),
                    shiftCompletionPreference: task.shiftCompletionPreference
                };
            });

            // Prepare data for Excel export
            const excelData: MultiShiftExcelData = {
                assignments: result.assignments,
                idleWorkers: result.idleWorkers,
                deficitTasks: result.deficitTasks,
                taskProgress,
                shift1Summary,
                shift2Summary,
                shift1Pct: startingShiftPct,
                shift2Pct: endingShiftPct,
                shift1Date,
                shift2Date
            };

            // Generate Excel buffer
            const buffer = generateMultiShiftResultsExcel(excelData, tasks);

            // Return as downloadable file
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=multi_shift_results.xlsx');
            res.send(buffer);

        } catch (error: any) {
            console.error("Multi-Shift Export Error:", error);
            const status = error?.statusCode || error?.status || 500;
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    // Debug endpoint: inspect shift bounds and interval parsing
    public debugShiftWindow = async (req: Request, res: Response) => {
        try {
            const shiftId = req.query.shiftId as string;
            const intervalStart = req.query.intervalStart as string;
            const intervalEnd = req.query.intervalEnd as string;

            const shift = await (async () => {
                try {
                    return await (await import('../queries/shift.query')).getShiftById(shiftId);
                } catch {
                    return null;
                }
            })();

            const buildDefault = (id: string, startRef?: string) => {
                let baseDate = '2024-01-01';
                if (startRef && startRef.includes('T')) {
                    const d = new Date(startRef);
                    if (!isNaN(d.getTime())) {
                        const y = d.getUTCFullYear();
                        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                        const day = String(d.getUTCDate()).padStart(2, '0');
                        baseDate = `${y}-${m}-${day}`;
                    }
                }
                const addDays = (dateStr: string, days: number) => {
                    const d = new Date(dateStr + 'T00:00:00Z');
                    d.setUTCDate(d.getUTCDate() + days);
                    const y = d.getUTCFullYear();
                    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(d.getUTCDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                };
                const nextDate = addDays(baseDate, 1);
                const defaults: Record<string, { startTime: string; endTime: string }> = {
                    'shift-1': { startTime: `${baseDate}T07:00:00Z`, endTime: `${baseDate}T17:00:00Z` },
                    'shift-2': { startTime: `${nextDate}T07:00:00Z`, endTime: `${nextDate}T17:00:00Z` }
                };
                return defaults[id] || null;
            };

            const effectiveShift = shift || buildDefault(shiftId, intervalStart);
            if (!effectiveShift) {
                res.status(404).json({ error: `Shift not found: ${shiftId}` });
                return;
            }

            const shiftStart = new Date(effectiveShift.startTime);
            const shiftEnd = new Date(effectiveShift.endTime);

            const parseTime = (base: Date, value: string) => {
                if (value.includes('T')) return new Date(value);
                const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
                if (!match) return null;
                const hour = Number(match[1]);
                const minute = Number(match[2]);
                return new Date(Date.UTC(
                    base.getUTCFullYear(),
                    base.getUTCMonth(),
                    base.getUTCDate(),
                    hour,
                    minute,
                    0,
                    0
                ));
            };

            const parsedStart = parseTime(shiftStart, intervalStart);
            const parsedEnd = parseTime(shiftStart, intervalEnd);
            if (!parsedStart || !parsedEnd) {
                res.status(400).json({ error: 'Invalid intervalStart/intervalEnd' });
                return;
            }

            const clampedStart = new Date(Math.max(parsedStart.getTime(), shiftStart.getTime()));
            const clampedEnd = new Date(Math.min(parsedEnd.getTime(), shiftEnd.getTime()));
            const overlaps = clampedStart < clampedEnd;

            res.json({
                shiftId,
                shiftFromDb: shift ? { startTime: shift.startTime, endTime: shift.endTime } : null,
                defaultApplied: !shift,
                defaultShift: !shift ? effectiveShift : null,
                requestedInterval: { intervalStart, intervalEnd },
                parsedInterval: { parsedStart: parsedStart.toISOString(), parsedEnd: parsedEnd.toISOString() },
                shiftBounds: { shiftStart: shiftStart.toISOString(), shiftEnd: shiftEnd.toISOString() },
                clampedInterval: { clampedStart: clampedStart.toISOString(), clampedEnd: clampedEnd.toISOString() },
                overlaps
            });
        } catch (error: any) {
            res.status(500).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    /**
     * KAN-383: Skill-based worker-task matching endpoint.
     * Matches workers to tasks based on required skills (hard constraint).
     *
     * POST /api/v1/worker-tasks/match
     *
     * @description Used by iOS app for one-time skill-based assignment.
     * Workers must have ALL required skills to qualify for a task.
     */
    public matchBySkills = async (req: Request, res: Response) => {
        try {
            const body = req.body as SkillMatchingRequest;

            // Validate request has required fields
            if (!body || typeof body !== 'object') {
                res.status(400).json({
                    error: 'Invalid request body',
                    message: 'Request body must be a JSON object with tasks and workers arrays'
                });
                return;
            }

            // Log request summary for debugging
            const taskCount = body.tasks?.length ?? 0;
            const workerCount = body.workers?.length ?? 0;
            console.log(`[KAN-383] Skill matching request: ${taskCount} tasks, ${workerCount} workers`);

            // Run matching algorithm
            const result = this.skillMatchingService.match(body);

            // Log results summary
            console.log(`[KAN-383] Matching complete:`, {
                assigned: result.assignments.length,
                idle: result.idleWorkers.length,
                deficit: result.deficitTasks.length,
                avgScore: result.stats.averageSkillScore
            });

            res.json({
                version: 'skill-match-v1',
                ...result
            });

        } catch (error: any) {
            console.error('[KAN-383] Skill matching error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: error?.message || 'Unknown error during skill matching'
            });
        }
    };

    /**
     * KAN-405: Stable Replan Endpoint
     * Replans remaining tasks from currentTime, minimizing reassignments.
     */
    public adjustPlan = async (req: Request, res: Response) => {
        try {
            const rawPlanId = req.params.planId;
            const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId;
            const body = req.body as AdjustPlanSimpleRequest;

            if (!planId) {
                res.status(400).json({ error: 'planId is required' });
                return;
            }
            if (!body.currentTime) {
                res.status(400).json({ error: 'currentTime is required' });
                return;
            }
            if (!body.tasks || !body.workers) {
                res.status(400).json({ error: 'tasks and workers definitions are required (server is stateless)' });
                return;
            }

            // Get Original Plan Assignments from DB
            const { getPlanById } = await import('../models/planModel');
            const plan = await getPlanById(planId);
            if (!plan) {
                res.status(404).json({ error: 'Plan not found' });
                return;
            }

            const originalAssignments = plan.assignments.map(a => ({
                workerId: a.workerId,
                taskId: a.taskId,
                startDate: a.startTime.toISOString(),
                endDate: a.endTime.toISOString(),
                shiftId: a.shiftId || undefined
            }));

            const diff = await this.planAdjustmentService.adjustPlanReplan(
                originalAssignments,
                body.tasks,
                body.workers,
                body
            );

            res.json(diff);

        } catch (error: any) {
            console.error("[AdjustPlan] Error:", error);
            const status = error?.statusCode || error?.status || 500;
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    private parseSchedulingConfig(body: any): SchedulingConfig | undefined {
        const parseNumber = (value: any): number | undefined => {
            const raw = Array.isArray(value) ? value[0] : value;
            if (raw === undefined || raw === null || raw === '') return undefined;
            const parsed = Number(typeof raw === 'string' ? raw.trim() : raw);
            return Number.isFinite(parsed) ? parsed : undefined;
        };

        const minAssignmentMinutes = parseNumber(body?.minAssignmentMinutes);
        const timeStepMinutes = parseNumber(body?.timeStepMinutes);
        const transitionGapMs = parseNumber(body?.transitionGapMs);

        if (minAssignmentMinutes === undefined && timeStepMinutes === undefined && transitionGapMs === undefined) {
            return undefined;
        }

        return {
            minAssignmentMinutes: minAssignmentMinutes as SchedulingConfig['minAssignmentMinutes'],
            timeStepMinutes,
            transitionGapMs
        };
    }

    // Helper to generate simple timeline from static assignments
    private generateTimeline(
        tasks: any[],
        assignments: any[],
        deficitTasks: any[],
        startTimeStr: string = "2024-01-01T07:00:00Z"
    ): any[] {
        const timeline: any[] = [];
        const baseTime = new Date(startTimeStr).getTime();

        // Group by Station -> Traveler
        // Tasks are already linear per traveler in the excel usually
        // But let's sort if needed. For now assume excel order is sequence.

        // We need to track end time per Traveler?
        // Actually, tasks are sequential per traveler usually.
        // Or per Station? 
        // In the factory, a Station works on a Traveler.
        // It's sequential.

        const travelerClock: Record<string, number> = {}; // TravelerID -> NextAvailableTime (ms)

        // Process tasks in order of appearance (assuming Excel order is process order)
        for (const task of tasks) {
            const trId = task.travelerId || 'Unknown';
            // Start at base time or previous task end
            const start = Math.max(baseTime, travelerClock[trId] || baseTime);

            let durationHours = task.estimatedLaborHours || 1;

            // Adjust details based on assignment
            const assignment = assignments.filter(a => a.taskId === task.taskId);
            const isDeficit = deficitTasks.some(d => d.taskId === task.taskId);

            let workersCount = assignment.length;
            let assignedWorkers = assignment.map((a: any) => a.workerId);
            const assignedWorkerNames = assignment.map((a: any) => a.workerName);

            // If matched, duration might decrease? 
            // Logic: Duration = EstHours / Workers.  (Simple linear scaling)
            // If 0 workers (deficit), assume 1 worker speed for visualization (or keep original estimate)
            const effWorkers = Math.max(1, workersCount);
            const actualDuration = durationHours / effWorkers;

            const end = start + (actualDuration * 3600 * 1000); // ms

            // Update clock
            travelerClock[trId] = end;

            timeline.push({
                ...task, // includes departmentId, station, etc
                startDate: new Date(start).toISOString(),
                endDate: new Date(end).toISOString(),
                assignedWorkers,
                assignedWorkerNames,
                isDeficit,
                travelerId: trId
            });
        }
        return timeline;
    }

    public crossDeptPlan = async (req: Request, res: Response) => {
        try {
            const file = req.file;
            if (!file) {
                res.status(400).send("No file uploaded.");
                return;
            }

            // 1. Load Mapping (Assume file is in root or data/)
            const devFile = path.resolve('Vederra Data Loading Developer.xlsx');
            if (!fs.existsSync(devFile)) {
                res.status(500).send("Mapping file 'Vederra Data Loading Developer.xlsx' not found on server.");
                return;
            }
            const devBuf = fs.readFileSync(devFile);
            const templateMap = loadStationTemplateMap(devBuf);

            // 2. Load Tasks and Workers
            const crossDeptTasks = loadCrossDeptTasks(file.buffer, templateMap);
            const skilledWorkers = loadSkilledWorkers(file.buffer, templateMap);

            console.log(`[CrossDept] Loaded ${crossDeptTasks.length} tasks and ${skilledWorkers.length} workers.`);

            // 3. Convert to MatchableTask format (normalize)
            const tasks = crossDeptTasks.map(t => ({
                taskId: t.id,
                name: t.taskName,
                requiredSkills: t.requiredSkills,
                minWorkers: t.minWorkers,
                maxWorkers: t.maxWorkers,
                estimatedLaborHours: t.durationHours,
                departmentId: t.department, // Important for Dept Constraint
                station: t.station, // Pass through extra data if needed? (Not in MatchableTask, but useful for UI)
                travelerId: t.travelerId
            }));

            // 4. Run Plans
            // Plan A: Department Constrained
            const deptPlan = this.skillMatchingService.match({
                tasks: tasks as any, // Cast because we added extra fields
                workers: skilledWorkers,
                enforceDepartmentMatch: true
            });
            const deptTimeline = this.generateTimeline(tasks, deptPlan.assignments, deptPlan.deficitTasks);

            // Plan B: Balanced (No Constraint)
            const balancedPlan = this.skillMatchingService.match({
                tasks: tasks as any,
                workers: skilledWorkers,
                enforceDepartmentMatch: false
            });
            const balancedTimeline = this.generateTimeline(tasks, balancedPlan.assignments, balancedPlan.deficitTasks);

            res.json({
                tasks: tasks.map(t => ({ ...t, station: (t as any).station, travelerId: (t as any).travelerId })), // Ensure extra fields returned
                workers: skilledWorkers,
                departmentPlan: { ...deptPlan, timeline: deptTimeline },
                balancedPlan: { ...balancedPlan, timeline: balancedTimeline }
            });

        } catch (error: any) {
            console.error("[CrossDept] Error:", error);
            res.status(500).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    // =============================================
    // KAN-468: Task Interruption Endpoints
    // =============================================

    /**
     * Create an interruption for a task.
     * POST /api/v1/worker-tasks/:planId/interruptions
     */
    public createInterruption = async (req: Request, res: Response) => {
        try {
            const planId = String(req.params.planId);
            const interruptionRequest: CreateInterruptionRequest = req.body;

            if (!planId) {
                res.status(400).json({ error: 'planId is required' });
                return;
            }

            if (!interruptionRequest.taskId) {
                res.status(400).json({ error: 'taskId is required' });
                return;
            }

            if (!interruptionRequest.reason) {
                res.status(400).json({ error: 'reason is required (material, equipment, or other)' });
                return;
            }

            const result = taskInterruptionService.createInterruption(planId, interruptionRequest);

            res.json({
                success: true,
                ...result
            });

        } catch (error: any) {
            console.error('[CreateInterruption] Error:', error);
            const status = error?.statusCode || 500;
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    /**
     * Resolve an interruption for a task.
     * POST /api/v1/worker-tasks/:planId/interruptions/:taskId/resolve
     */
    public resolveInterruption = async (req: Request, res: Response) => {
        try {
            const planId = String(req.params.planId);
            const taskId = String(req.params.taskId);

            if (!planId || !taskId) {
                res.status(400).json({ error: 'planId and taskId are required' });
                return;
            }

            const result = taskInterruptionService.resolveInterruption(planId, taskId);

            res.json({
                success: true,
                ...result
            });

        } catch (error: any) {
            console.error('[ResolveInterruption] Error:', error);
            const status = error?.statusCode || 500;
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    /**
     * Get all active interruptions for a plan.
     * GET /api/v1/worker-tasks/:planId/interruptions
     */
    public getInterruptions = async (req: Request, res: Response) => {
        try {
            const planId = String(req.params.planId);

            if (!planId) {
                res.status(400).json({ error: 'planId is required' });
                return;
            }

            const interruptions = taskInterruptionService.getInterruptions(planId);

            res.json({
                planId,
                interruptions,
                count: interruptions.length
            });

        } catch (error: any) {
            console.error('[GetInterruptions] Error:', error);
            const status = error?.statusCode || 500;
            res.status(status).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    // ========================================
    // TEMPORARY: Time override for testing
    // TODO: Remove before production
    // ========================================

    /**
     * TEMPORARY: Set time override for interruption testing.
     * POST /api/v1/worker-tasks/debug/time-override
     * Body: { time: "2026-01-27T10:00:00Z" } or { time: null } to clear
     */
    public setTimeOverride = async (req: Request, res: Response) => {
        try {
            const { time } = req.body;
            taskInterruptionService.setTimeOverride(time || null);

            res.json({
                success: true,
                timeOverride: time || null,
                message: time ? `Time override set to: ${time}` : 'Time override cleared - using real time'
            });
        } catch (error: any) {
            console.error('[SetTimeOverride] Error:', error);
            res.status(500).json({ error: error?.message || 'Internal Server Error' });
        }
    };

    /**
     * TEMPORARY: Get current time override.
     * GET /api/v1/worker-tasks/debug/time-override
     */
    public getTimeOverride = async (_req: Request, res: Response) => {
        try {
            const timeOverride = taskInterruptionService.getTimeOverride();

            res.json({
                timeOverride,
                isOverridden: timeOverride !== null,
                realTime: new Date().toISOString()
            });
        } catch (error: any) {
            console.error('[GetTimeOverride] Error:', error);
            res.status(500).json({ error: error?.message || 'Internal Server Error' });
        }
    };
}
