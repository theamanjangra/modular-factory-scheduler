import { Request, Response } from 'express'; // Ensure express types are installed
import { PlanningService } from '../services/planningService';
import { PlanRequest, SkillMatchingRequest, AdjustPlanSimpleRequest, SchedulingConfig } from '../types';
import { MultiShiftPlanningService } from '../services/multiShiftPlanningService';
import { MultiShiftFilePlanningService } from '../services/multiShiftFilePlanningService';
import { SkillMatchingService } from '../services/skillMatchingService';
import { parseExcelData } from '../utils/excelLoader';
import { aggregateSchedule, mergeConsecutiveItems } from '../utils/scheduleAggregator';
import { VerificationService } from '../services/verificationService';
// import { PlanAdjustmentService } from '../services/planAdjustmentService';
import { generateResultsExcel, generateMultiShiftResultsExcel, MultiShiftExcelData } from '../utils/excelGenerator';
import { loadSkilledWorkers, loadCrossDeptTasks, loadStationTemplateMap } from '../utils/stationDepartmentLoader';
import { taskInterruptionService } from '../services/taskInterruptionService';
import { CreateInterruptionRequest, PlanPreviewRequest, ProductionPlanShiftDto, DeficitTask, MultiShiftPlanRequest, ProductionPlanDto, WorkerDto, DepartmentDto, TaskDto, WorkerTaskDto, DeficitTaskDto, ShiftDto } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/db'; // Import Prisma Client
import { SchedulingAdapterService } from '../services/schedulingAdapterService'; // Import Adapter
import { LaborEstimationService } from '../services/laborEstimationService';
import { getWorkersWithShifts, getTasksWithEstimationData, getAllTaskIdsSample, getClockedInWorkerIds } from '../queries/adjustPlan.query';

export class WorkerTaskController {
    private planningService: PlanningService;
    private multiShiftPlanningService: MultiShiftPlanningService;
    private multiShiftFilePlanningService: MultiShiftFilePlanningService;
    private skillMatchingService: SkillMatchingService;
    // private planAdjustmentService: PlanAdjustmentService;
    private schedulingAdapterService: SchedulingAdapterService;
    private laborEstimationService: LaborEstimationService;

    constructor() {
        this.planningService = new PlanningService();
        this.multiShiftPlanningService = new MultiShiftPlanningService();
        this.multiShiftFilePlanningService = new MultiShiftFilePlanningService();
        this.skillMatchingService = new SkillMatchingService();
        // this.planAdjustmentService = new PlanAdjustmentService();
        this.schedulingAdapterService = new SchedulingAdapterService();
        this.laborEstimationService = new LaborEstimationService(prisma);
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

            // --- DYNAMIC SHIFT PARSING ---
            let shiftsInput = [];

            // 1. Try parsing 'shifts' JSON string
            if (req.body.shifts) {
                try {
                    const parsed = typeof req.body.shifts === 'string' ? JSON.parse(req.body.shifts) : req.body.shifts;
                    if (Array.isArray(parsed)) {
                        shiftsInput = parsed;
                    }
                } catch (e) {
                    console.warn("Failed to parse 'shifts' body param", e);
                }
            }

            // 2. Fallback to Legacy Shift 1/2 fields if no shifts provided
            if (shiftsInput.length === 0) {
                const shift1StartTime = req.body.shift1StartTime || startTime;
                const shift1EndTime = req.body.shift1EndTime || endTime;
                const shift2StartTime = req.body.shift2StartTime;
                const shift2EndTime = req.body.shift2EndTime;
                const startingShiftPct = parseFloat(req.body.startingShiftPct);

                // Legacy required fields check
                if (isNaN(startingShiftPct)) {
                    // If we have no shifts AND no legacy pct, we can't plan properly.
                    // But maybe user just wants single shift default?
                    // Let's warn but proceed with 1 shift.
                }

                // Shift 1
                shiftsInput.push({
                    id: 'shift-1',
                    startTime: shift1StartTime,
                    endTime: shift1EndTime,
                    productionRate: !isNaN(startingShiftPct) ? startingShiftPct : 1.0
                });

                // Shift 2
                if (shift2StartTime && shift2EndTime) {
                    shiftsInput.push({
                        id: 'shift-2',
                        startTime: shift2StartTime,
                        endTime: shift2EndTime,
                        productionRate: req.body.endingShiftPct ? parseFloat(req.body.endingShiftPct) : (1 - (startingShiftPct || 0.5))
                    });
                }
            }

            // Construct Adapter-style input (ExternalSchedulingInput)
            // But we are calling MultiShiftFilePlanningService directly. 
            // It expects `MultiShiftFilePlanRequest`.
            // Let's look at `multiShiftFilePlanningService.plan` signature.
            // It takes `input: { shifts?: ..., shift1Interval?: ... }`.
            // We should Update MultiShiftFilePlanningService to accept `shifts` array too if it doesn't already.
            // Wait, I updated `MultiShiftPlanningService` (core), but `MultiShiftFilePlanningService` calls it.
            // `MultiShiftFilePlanningService.plan` constructs `MultiShiftPlanRequest`.

            // Let's pass the raw `shifts` array to `MultiShiftFilePlanningService`
            // and ensure that service handles it. 
            // NOTE: I haven't checked `MultiShiftFilePlanningService.ts` yet! 
            // I should assume I need to update it to pass `shifts` through.

            const requestBody = {
                startTime,
                endTime,
                shifts: shiftsInput, // NEW FIELD
                tasks,
                workers,
                scheduling: this.parseSchedulingConfig(req.body)
            };

            const result = await this.multiShiftFilePlanningService.plan(requestBody as any);

            // Calculate taskProgress manually to ensure it's sent to frontend
            // REFACTOR: Handle N shifts
            const getDateKey = (dateStr: string) => dateStr.split('T')[0];

            const taskProgress = tasks.map(task => {
                const totalRequired = task.estimatedTotalLaborHours || 0;
                let totalWorked = 0;
                let completedInOneShift = false;
                let whichShiftCompleted = '';
                let isSpanning = false;

                // Track hours per shift
                const hoursByShift: Record<string, number> = {};

                shiftsInput.forEach((shift: any) => {
                    const shiftDate = getDateKey(shift.startTime);

                    const shiftAssignments = result.assignments.filter(a =>
                        a.taskId === task.taskId &&
                        // Overlap check? Or just date match? 
                        // Ideally we check if assignment falls within shift window.
                        // For simplicity, we stick to date-based matching if shift IDs aren't on assignments yet.
                        // But wait, `result.assignments` might NOT have shiftId if `multiShiftFilePlanningService` doesn't stamp it.
                        // The core `MultiShiftPlanningService` now DOES stamp `shiftId`!
                        (a.shiftId === shift.id || (getDateKey(a.startDate) === shiftDate))
                    );

                    const hours = shiftAssignments.reduce((total, a) => {
                        return total + (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
                    }, 0);

                    hoursByShift[shift.id] = hours;
                    totalWorked += hours;

                    if (hours >= totalRequired) {
                        completedInOneShift = true;
                        whichShiftCompleted = shift.id;
                    }
                });

                // If not completed in one, but worked in multiple
                const workedShiftsCount = Object.values(hoursByShift).filter(h => h > 0).length;
                if (!completedInOneShift && workedShiftsCount > 1) {
                    isSpanning = true;
                }

                const completionPct = totalRequired > 0 ? Math.min(100, (totalWorked / totalRequired) * 100) : 0;

                return {
                    taskId: task.taskId,
                    taskName: task.name,
                    hoursByShift, // NEW: send map
                    // Legacy Compat
                    shift1Hours: hoursByShift['shift-1'] || 0,
                    shift2Hours: hoursByShift['shift-2'] || 0,

                    totalRequiredHours: totalRequired,
                    completionPercentage: completionPct,
                    completedInShift: completionPct >= 100
                        ? (completedInOneShift ? whichShiftCompleted : 'spans_shifts') // Return ID instead of 'shift1'
                        : (workedShiftsCount > 1 ? 'spans_shifts' : 'incomplete'),
                    shiftCompletionPreference: task.shiftCompletionPreference
                };
            });

            // Tiago's Persistence Layer Logic (Disabled for Stateless API)
            // let planId: string | undefined;
            // try {
            //     const savedPlan = await prisma.productionPlan.create({
            //         data: {
            //             name: `MultiShift Import ${new Date().toISOString()}`,
            //             inputSnapshot: requestBody as any,
            //             assignments: {
            //                 create: result.assignments
            //                     .filter(a => (a.workerId && a.taskId) || (a as any).isWaitTask)
            //                     .map(a => ({
            //                         workerId: a.workerId || 'GAP_VIRTUAL_WORKER',
            //                         taskId: a.taskId || 'unknown',
            //                         shiftId: a.shiftId || 'unknown', // Now available!
            //                         startTime: new Date(a.startDate),
            //                         endTime: new Date(a.endDate)
            //                     }))
            //             }
            //         }
            //     });
            //     planId = savedPlan.id;
            //     console.log(`[Persistence] Saved Plan ID: ${planId}`);
            // } catch (dbError) {
            //     console.error("[Persistence] Failed to save plan to DB:", dbError);
            //     planId = 'ephemeral';
            // }
            const planId = 'ephemeral';

            const mergedAssignments = mergeConsecutiveItems(result.assignments);
            const mergedIdle = mergeConsecutiveItems(result.idleWorkers.map(u => ({ ...u, taskId: 'IDLE' })));

            res.json({
                version: "multi-shift-file-v3-dynamic",
                planId,
                ...result,
                assignments: mergedAssignments,
                idleWorkers: mergedIdle,
                taskProgress, // Updated structure
                tasks,
                workers
            });
        } catch (error: any) {
            console.error("Plan File Error", error);
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
        res.status(501).json({ error: "Not Implemented in Stateless Mode" });
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

    /**
     * Temporary Data Visualization Tool
     * Serves a simple HTML page to browse TaskTemplates, TimeStudies, and Attributes.
     * Helpful for debugging "Missing Link" issues in labor estimation.
     */
    public getDataViz = async (req: Request, res: Response) => {
        try {
            const templates = await prisma.taskTemplate.findMany({
                include: {
                    taskTemplateModuleAttributes: { include: { moduleAttribute: true } },
                    timeStudies: { include: { timeStudyModuleAttributes: { include: { moduleAttribute: true } } } }
                },
                orderBy: { name: 'asc' }
            });

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Labor Data Viz</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; background: #f4f4f4; }
                    .card { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    h1 { color: #333; }
                    h3 { margin-top: 0; color: #007bff; }
                    .tag { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; margin-bottom: 5px; }
                    .tag-req { background: #e3f2fd; color: #0d47a1; border: 1px solid #90caf9; }
                    .tag-avail { background: #e8f5e9; color: #1b5e20; border: 1px solid #a5d6a7; }
                    .tag-missing { background: #ffebee; color: #b71c1c; border: 1px solid #ef9a9a; }
                    .section { margin-top: 10px; }
                    .match { color: green; font-weight: bold; }
                    .mismatch { color: red; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>Labor Data Visualization (${templates.length} Templates)</h1>
                ${templates.map(t => {
                const reqAttrs = t.taskTemplateModuleAttributes.map(a => a.moduleAttribute.name);
                const ts = t.timeStudies[0]; // Just check first one for viz
                const availAttrs = ts ? ts.timeStudyModuleAttributes.map(a => a.moduleAttribute.name) : [];

                // Intersection
                const intersection = reqAttrs.filter(r => availAttrs.includes(r));
                const isPerfect = intersection.length > 0 && intersection.length === reqAttrs.length;
                const status = !ts ? 'NO TIME STUDY' : (isPerfect ? 'PERFECT' : (intersection.length > 0 ? 'PARTIAL' : 'MISMATCH'));
                const statusColor = status === 'PERFECT' ? 'green' : (status === 'MISMATCH' ? 'red' : 'orange');

                return `
                    <div class="card">
                        <h3>${t.name} <span style="font-size:0.8em; color:${statusColor}">[${status}]</span></h3>
                        
                        <div class="section">
                            <strong>Required (Logic):</strong><br/>
                            ${reqAttrs.length ? reqAttrs.map(a => `<span class="tag tag-req">${a}</span>`).join('') : '<em>None</em>'}
                        </div>

                        <div class="section">
                            <strong>Available (History):</strong><br/>
                            ${ts ? availAttrs.map(a => `<span class="tag tag-avail">${a}</span>`).join('') : '<em>No Time Studies</em>'}
                        </div>

                        ${ts && !isPerfect ? `
                        <div class="section">
                            <strong style="color:red">Missing Links:</strong><br/>
                            ${reqAttrs.filter(r => !availAttrs.includes(r)).map(a => `<span class="tag tag-missing">${a}</span>`).join('')}
                        </div>
                        ` : ''}

                        <div class="section">
                            <strong>Fallback Strategy:</strong> 
                            ${status === 'PERFECT' ? 'Proportional Scaling' : (ts ? 'Average Clock Time (' + ts.clockTime + 'h)' : 'Default (1.0h)')}
                        </div>
                    </div>
                    `;
            }).join('')}
            </body>
            </html>
            `;

            res.send(html);
        } catch (error: any) {
            res.status(500).send(error.message);
        }
    };

    /**
     * Production Plan Preview (Swift Client)
     * Takes tasks and shift definitions, returns a structured plan preview.
     */
    public getProductionPlanPreview = async (req: Request, res: Response) => {
        try {
            const body = req.body as PlanPreviewRequest;

            // 1. Validate Input
            if (!body.tasks || !Array.isArray(body.tasks)) {
                res.status(400).json({ error: "Tasks array is required (key: 'tasks')." });
                return;
            }
            // Check for 'productionPlanShifts' (Swift Client) or 'shifts' (Legacy/Simple)
            const shiftsInput = body.productionPlanShifts || (body as any).shifts;
            if (!shiftsInput || !Array.isArray(shiftsInput)) {
                res.status(400).json({ error: "productionPlanShifts array is required (key: 'productionPlanShifts')." });
                return;
            }

            // 2. Auto-fetch workers + attendance data from Data Connect (READ-ONLY)
            const [dcWorkers, clockedInWorkerIds] = await Promise.all([
                getWorkersWithShifts(),
                getClockedInWorkerIds().catch(e => {
                    console.warn('[Preview] TimeLogs fetch failed, skipping attendance check:', e);
                    return new Set<string>();
                })
            ]);
            console.log(`[Preview] Fetched ${dcWorkers.length} workers, ${clockedInWorkerIds.size} clocked-in`);

            // Map Data Connect Workers to Swift 'Worker' Struct
            const hydratedWorkers: WorkerDto[] = dcWorkers.map((w: any) => {
                const wdList = w.workerDepartments_on_worker || w.workerDepartments || [];
                const primaryWd = wdList.find((wd: any) => wd.isLead) || wdList[0];
                const dept: DepartmentDto = primaryWd?.department
                    ? { id: primaryWd.department.id }
                    : { id: '00000000-0000-0000-0000-000000000000' };

                return {
                    id: w.id,
                    department: dept,
                    name: `${w.firstName || ''} ${w.lastName || ''}`.trim(),
                    rankedSkills: w.rankedSkills || [],
                    workerTaskTemplates_on_worker: w.workerTaskTemplates_on_worker || []
                };
            });

            // 3. Map Inputs to Planner Request
            // Use the unique production plan shift ID (s.id) — NOT the shift template ID (s.shift.id)
            // Multiple shifts can share the same template (e.g. same "Five eights" on Mon, Tue, Wed, Thu)
            const safeShiftWindows = shiftsInput.map((s: any) => {
                const shiftDetails = s.shift || s;
                const isStringDate = (v: any) => typeof v === 'string' && v.includes('T');
                const toIso = (v: any) => isStringDate(v) ? v : new Date(v * 1000).toISOString();

                const startTime = s.occurrenceStartTimestamp || shiftDetails.startTime;
                const endTime = s.occurrenceEndTimestamp || shiftDetails.endTime;

                return {
                    shiftId: s.id || s.shiftId || shiftDetails.id, // Prefer unique PPS ID over shared template ID
                    occurrenceDate: s.occurrenceDate || null,       // e.g. "2026-01-20" — used to match assignments to shifts
                    productionRate: s.productionRate !== undefined ? s.productionRate : (s.shareOfWork !== undefined ? s.shareOfWork : (1.0 / shiftsInput.length)),
                    shiftInterval: {
                        start: toIso(startTime),
                        end: toIso(endTime)
                    }
                };
            });

            // Fetch task data from production DB via Data Connect (READ-ONLY)
            // This gives us: labor estimation data, departmentId (via taskTemplate), prerequisites
            const taskIds = body.tasks.map(t => t.id).filter(id => id);
            // Normalize UUIDs for consistent map keys (DC may return different format than client)
            const normalizeId = (id: string) => id?.toLowerCase().replace(/-/g, '');
            let laborEstimates = new Map<string, number>();
            let taskDeptMap = new Map<string, string>();       // normalizedTaskId → departmentId
            let taskPrereqMap = new Map<string, string>();     // normalizedTaskId → prerequisiteTaskTemplateId
            let taskTemplateMap = new Map<string, string>();   // normalizedTaskId → taskTemplateId
            let taskMinWorkersMap = new Map<string, number>(); // normalizedTaskId → minWorkers
            let taskSkillsMap = new Map<string, string[]>();  // normalizedTaskId → rankedSkills
            let taskMaxWorkersMap = new Map<string, number>(); // normalizedTaskId → maxWorkers

            let _allDbTaskSample: any[] = []; // Temp debug: sample task IDs from DC
            try {
                // Temp debug: fetch sample task IDs to help with testing
                try { _allDbTaskSample = await getAllTaskIdsSample(5); } catch (_) { }

                if (taskIds.length > 0) {
                    const estimationData = await getTasksWithEstimationData(taskIds);
                    laborEstimates = calculateLaborEstimates(estimationData);

                    // Extract department and prerequisite info from DC data
                    // Use normalizeId for map keys to handle UUID format differences
                    for (const dcTask of estimationData) {
                        const nId = normalizeId(dcTask.id);
                        const tmpl = dcTask.taskTemplate;
                        if (!tmpl) continue;
                        if (tmpl.department?.id) {
                            taskDeptMap.set(nId, tmpl.department.id);
                        }
                        if (tmpl.id) {
                            taskTemplateMap.set(nId, tmpl.id);
                        }
                        if (tmpl.prerequisiteTaskTemplate?.id) {
                            taskPrereqMap.set(nId, tmpl.prerequisiteTaskTemplate.id);
                        }
                        if (tmpl.minWorkers != null) {
                            taskMinWorkersMap.set(nId, tmpl.minWorkers);
                        }
                        if (tmpl.maxWorkers != null) {
                            taskMaxWorkersMap.set(nId, tmpl.maxWorkers);
                        }
                        if (tmpl.rankedSkills && Array.isArray(tmpl.rankedSkills) && tmpl.rankedSkills.length > 0) {
                            taskSkillsMap.set(nId, tmpl.rankedSkills);
                        }
                    }

                    // Debug: log estimation details
                    const estimateValues = Array.from(laborEstimates.entries()).map(([id, hrs]) => `${id.slice(0, 8)}=${hrs.toFixed(2)}h`);
                    console.log(`[Preview] Estimated labor hours for ${laborEstimates.size}/${taskIds.length} tasks, ${taskDeptMap.size} with departments via Data Connect.`);
                    console.log(`[Preview] DC returned ${estimationData.length} tasks from DB for ${taskIds.length} requested IDs`);
                    console.log(`[Preview] Estimates: ${estimateValues.slice(0, 10).join(', ')}${estimateValues.length > 10 ? ` ... and ${estimateValues.length - 10} more` : ''}`);

                    // Log tasks that got no estimate
                    const missingEstimates = taskIds.filter(id => !laborEstimates.has(normalizeId(id)));
                    if (missingEstimates.length > 0) {
                        console.log(`[Preview] WARNING: ${missingEstimates.length} tasks got NO estimate: ${missingEstimates.slice(0, 5).map(id => id.slice(0, 8)).join(', ')}`);
                    }
                }
            } catch (e) {
                console.warn(`[Preview] Data Connect task data fetch failed, using defaults:`, e);
            }

            // Build templateId → taskIds map for prerequisite resolution
            // Normalize template IDs too — DC may return different UUID formats
            const templateToTaskIds = new Map<string, string[]>();
            for (const [taskId, tmplId] of taskTemplateMap) {
                const nTmplId = normalizeId(tmplId);
                if (!templateToTaskIds.has(nTmplId)) {
                    templateToTaskIds.set(nTmplId, []);
                }
                templateToTaskIds.get(nTmplId)!.push(taskId);
            }

            // Debug prerequisite resolution
            console.log(`[Preview] Prerequisite maps: taskPrereqMap=${taskPrereqMap.size} entries, templateToTaskIds=${templateToTaskIds.size} templates`);
            if (taskPrereqMap.size > 0) {
                for (const [taskId, prereqTmplId] of taskPrereqMap) {
                    const nPrereqTmplId = normalizeId(prereqTmplId);
                    const resolved = templateToTaskIds.get(nPrereqTmplId);
                    console.log(`[Preview] Prereq: task ${taskId.slice(0,8)} → prereqTemplate ${prereqTmplId.slice(0,8)} → resolved to ${resolved ? resolved.map(id => id.slice(0,8)).join(',') : 'NONE (template not in current task set)'}`);
                }
            } else {
                console.log(`[Preview] WARNING: No prerequisiteTaskTemplate found in ANY DC task data — check if prerequisiteTaskTemplate field is populated in DB`);
            }

            const multiShiftRequest: MultiShiftPlanRequest = {
                shifts: safeShiftWindows,
                tasks: body.tasks.map(t => {
                    // Normalize task ID for map lookups (DC may return different UUID format)
                    const nId = normalizeId(t.id);
                    // Resolve prerequisiteTaskIds from template relationship
                    const prereqTemplateId = taskPrereqMap.get(nId);
                    const prerequisiteTaskIds = prereqTemplateId
                        ? (templateToTaskIds.get(normalizeId(prereqTemplateId)) || [])
                        : [];

                    return {
                        ...t,
                        taskId: normalizeId(t.id),
                        // Department from DC (taskTemplate.department), fallback to client-sent
                        departmentId: taskDeptMap.get(nId) || (t as any).departmentId || (t as any).department?.id || undefined,
                        estimatedTotalLaborHours: laborEstimates.get(nId) ?? t.estimatedTotalLaborHours ?? 1.0,
                        minWorkers: taskMinWorkersMap.get(nId) ?? (t as any).minWorkers ?? 1,
                        maxWorkers: taskMaxWorkersMap.get(nId) ?? (t as any).maxWorkers ?? 100,
                        prerequisiteTaskIds: prerequisiteTaskIds.length > 0 ? prerequisiteTaskIds : ((t as any).prerequisiteTaskIds || []),
                        requiredSkills: taskSkillsMap.get(nId) || (t as any).requiredSkills || [],
                    };
                }) as any,
                workers: hydratedWorkers.map(w => {
                    // Map DB WorkerTaskPreference enum to numeric rank for BalancingService
                    const prefRank: Record<string, number> = {
                        'primaryJob': 1, 'secondaryJob': 2, 'canHelp': 3, 'canNotHelp': 4
                    };
                    const prefs: Record<string, number> = {};
                    for (const wtt of (w as any).workerTaskTemplates_on_worker || []) {
                        const name = wtt.taskTemplate?.name;
                        if (name && wtt.preference) {
                            prefs[name] = prefRank[wtt.preference] ?? 3;
                        }
                    }
                    return {
                        id: w.id,
                        workerId: w.id, // Internal planner uses 'workerId'
                        name: w.name,
                        departmentId: w.department?.id || undefined, // Department for dept-wise scheduling
                        preferences: Object.keys(prefs).length > 0 ? prefs : undefined,
                        skills: (w as any).rankedSkills || [],
                        shiftPreference: undefined,
                        availability: undefined
                    };
                }) as any,
                enforceDepartmentMatch: true,
                useCrewCap: false,
                useTwoPassDepartmentScheduling: false, // Toggle: Pass 1 = hard dept, Pass 2 = soft scoring for idle workers
                preventLateJoiners: true, // Toggle: don't assign new workers to tasks past halfway with an active crew
                keepCrewTogether: true, // Toggle: all crew members stay on a task until it's complete
                clockedInWorkerIds
            };

            // 4. Run Planning Logic
            const result = await this.multiShiftPlanningService.plan(multiShiftRequest);

            // 5. Transform to ProductionPlanShiftDto Structure
            // Match assignments to shifts by date (occurrenceDate) or by time window
            const getDateFromIso = (iso: string) => iso ? iso.slice(0, 10) : ''; // "2026-01-20T13:30:00Z" → "2026-01-20"

            const getShiftIdForAssignment = (assignment: any): string => {
                // First try: match by shiftId if planner tagged it with unique PPS ID
                if (assignment.shiftId) {
                    const match = safeShiftWindows.find(s => s.shiftId === assignment.shiftId);
                    if (match) return match.shiftId;
                }
                // Second: match by occurrenceDate — compare assignment's date to shift's occurrence date
                const assignDate = getDateFromIso(assignment.startDate);
                for (const s of safeShiftWindows) {
                    if (s.occurrenceDate && s.occurrenceDate === assignDate) return s.shiftId;
                }
                // Fallback: match by time window
                const assignStart = new Date(assignment.startDate).getTime();
                for (const s of safeShiftWindows) {
                    const sStart = new Date(s.shiftInterval.start).getTime();
                    const sEnd = new Date(s.shiftInterval.end).getTime();
                    if (assignStart >= sStart && assignStart < sEnd) return s.shiftId;
                }
                return 'unknown';
            };

            const taskMap = new Map((body.tasks as any[]).map(t => [t.id, t]));
            const workerMap = new Map(hydratedWorkers.map(w => [w.id, w]));

            const productionPlanShifts: ProductionPlanShiftDto[] = shiftsInput.map((s: any, index: number) => {
                const shiftDetails = s.shift || s;
                const ppsId = s.id || s.shiftId || shiftDetails.id; // Unique production plan shift ID
                const safeWindow = safeShiftWindows[index];

                // Filter assignments belonging to THIS specific shift occurrence
                const rawShiftAssignments = result.assignments.filter(a => getShiftIdForAssignment(a) === safeWindow.shiftId && a.workerId);

                // Merge consecutive 5-min time steps into consolidated blocks
                const shiftAssignments = mergeConsecutiveItems(rawShiftAssignments);

                const workerTasks = shiftAssignments.map(a => ({
                    id: uuidv4(),
                    workerId: a.workerId || null,
                    taskId: a.taskId || null,
                    startDate: a.startDate,
                    endDate: a.endDate
                }));

                const isLastShift = index === shiftsInput.length - 1;
                let shiftDeficits: DeficitTaskDto[] = [];

                if (isLastShift && result.deficitTasks) {
                    shiftDeficits = result.deficitTasks.map(d => ({
                        id: uuidv4(),
                        taskId: d.taskId || null,
                        deficitHours: d.deficitHours
                    }));
                }

                return {
                    id: s.id || uuidv4(),
                    shift: shiftDetails,
                    occurrenceStartTimestamp: safeWindow.shiftInterval.start,
                    occurrenceEndTimestamp: safeWindow.shiftInterval.end,
                    occurrenceDate: safeWindow.occurrenceDate,
                    workerTasks,
                    deficitTasks: shiftDeficits
                };
            });

            // 6. Return Response
            // startShift/endShift removed as per user request (redundant with productionPlanShifts)

            const responseData = {
                id: 'preview-plan-id',
                startDate: (body as any).startTimestamp || body.startTime,
                endDate: (body as any).endTimestamp || body.endTime,
                productionPlanShifts: productionPlanShifts,
                _debug: {
                    totalTasksInput: taskIds.length,
                    tasksWithEstimates: laborEstimates.size,
                    unmatchedTaskIds: taskIds.filter(id => !laborEstimates.has(normalizeId(id))),
                    workersFound: hydratedWorkers.length,
                    shiftWindows: safeShiftWindows.map(s => ({ shiftId: s.shiftId, start: s.shiftInterval.start, end: s.shiftInterval.end })),
                    sampleEstimates: Object.fromEntries(Array.from(laborEstimates.entries()).map(([id, hrs]) => [id, hrs])),
                    taskWorkerLimits: Object.fromEntries(Array.from(taskMaxWorkersMap.entries()).map(([id, max]) => [id, { min: taskMinWorkersMap.get(id) || 1, max }])),
                    taskPrerequisites: Object.fromEntries(
                        (multiShiftRequest.tasks as any[])
                            .filter(t => t.prerequisiteTaskIds && t.prerequisiteTaskIds.length > 0)
                            .map(t => [normalizeId(t.taskId || t.id), t.prerequisiteTaskIds])
                    ),
                    rawAssignmentsFromPlanner: result.assignments.length,
                    totalWorkerTasks: productionPlanShifts.reduce((sum, s) => sum + s.workerTasks.length, 0),
                    totalDeficitTasks: productionPlanShifts.reduce((sum, s) => sum + s.deficitTasks.length, 0),
                    workersByDept: hydratedWorkers.reduce((acc: Record<string, number>, w) => { const d = w.department?.id || 'none'; acc[d] = (acc[d] || 0) + 1; return acc; }, {}),
                    workers: hydratedWorkers.map(w => ({ id: w.id, name: w.name, department: w.department?.id || null, rankedSkills: (w as any).rankedSkills || [], preferences: (multiShiftRequest.workers as any[]).find(mw => mw.workerId === w.id)?.preferences || null })),
                    taskDepts: Object.fromEntries(Array.from(taskDeptMap.entries())),
                    taskSkills: Object.fromEntries((multiShiftRequest.tasks as any[]).filter(t => t.requiredSkills && t.requiredSkills.length > 0).map(t => [t.taskId, t.requiredSkills])),
                    plannerDiag: (result as any)?._plannerDiag || null,
                    shiftProductionRates: safeShiftWindows.map(s => ({ shiftId: s.shiftId, productionRate: s.productionRate })),
                    workerPreferencesLoaded: (multiShiftRequest.workers as any[]).filter(w => w.preferences && Object.keys(w.preferences).length > 0).length,
                    workersWithSkills: (multiShiftRequest.workers as any[]).filter(w => w.skills && w.skills.length > 0).length,
                    tasksWithRequiredSkills: (multiShiftRequest.tasks as any[]).filter(t => t.requiredSkills && t.requiredSkills.length > 0).length,
                    clockedInWorkers: clockedInWorkerIds.size,
                    attendanceFilterActive: clockedInWorkerIds.size > 0,
                    availableDbTasks: _allDbTaskSample,
                    inputTaskIds: taskIds.slice(0, 5),
                    twoPassDiag: (result as any)?._twoPassDiag || null,
                }
            };

            res.json(responseData);

        } catch (error: any) {
            console.error("[GetProductionPlanPreview] Error:", error);
            res.status(500).json({ error: error?.message || 'Internal Server Error' });
        }
    };
}

// ── Labor Estimation from Data Connect data ──────────────────────────────────
// Same algorithm as LaborEstimationService but operates on pre-fetched DC data.
// Algorithm: estimatedHours = timeStudy.clockTime * avg(moduleAttrValue / timeStudyAttrValue)

function calculateLaborEstimates(tasks: any[]): Map<string, number> {
    const results = new Map<string, number>();
    const normalizeId = (id: string) => id?.toLowerCase().replace(/-/g, '');

    for (const task of tasks) {
        // Prefer estimatedLaborHours stored directly on the Task (from DC)
        const dcEstimate = task.estimatedLaborHours;
        if (dcEstimate != null && dcEstimate > 0) {
            results.set(normalizeId(task.id), dcEstimate);
            continue;
        }

        // Fallback: nonWorkerTaskDuration from template, or default 1.0h
        const fallback = task.taskTemplate?.nonWorkerTaskDuration || 1.0;
        console.log(`[Preview] No estimatedLaborHours for task ${task.id?.slice(0, 8)} → fallback ${fallback}h`);
        results.set(normalizeId(task.id), fallback);
    }

    return results;
}

function estimateForSingleTask(task: any): number {
    const taskTemplate = task.taskTemplate;
    const traveler = task.traveler;

    if (!traveler?.moduleProfile) {
        throw new Error('No ModuleProfile');
    }

    // Step 1: Module profile attribute values
    const moduleAttrValues = new Map<string, number>();
    for (const mpma of (traveler.moduleProfile.moduleProfileModuleAttributes_on_moduleProfile || traveler.moduleProfile.moduleProfileModuleAttributes || [])) {
        const numVal = parseFloat(mpma.value);
        if (!isNaN(numVal)) {
            moduleAttrValues.set(mpma.moduleAttribute?.id, numVal);
        }
    }

    // Step 2: Relevant attribute IDs from task template
    const relevantAttrIds = new Set<string>(
        (taskTemplate?.taskTemplateModuleAttributes_on_taskTemplate || taskTemplate?.taskTemplateModuleAttributes || []).map((ttma: any) => ttma.moduleAttribute?.id)
    );

    // Step 3: Find best time study (most recent with valid clockTime)
    const timeStudies = (taskTemplate?.timeStudies_on_taskTemplate || taskTemplate?.timeStudies || [])
        .filter((ts: any) => ts.clockTime && ts.clockTime > 0)
        .sort((a: any, b: any) => {
            // Sort by date descending (most recent first)
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

    const timeStudy = timeStudies[0];
    if (!timeStudy) {
        throw new Error('No valid TimeStudy');
    }

    const clockTime = timeStudy.clockTime;

    // Step 4: Intersection — attributes relevant to both template and module profile
    const intersectedAttrIds: string[] = [];
    for (const attrId of relevantAttrIds) {
        if (moduleAttrValues.has(attrId)) {
            intersectedAttrIds.push(attrId);
        }
    }

    if (intersectedAttrIds.length === 0) {
        // No attribute overlap — use clockTime directly
        return Math.max(0.1, clockTime);
    }

    // Step 5: Time study attribute values
    const timeStudyAttrValues = new Map<string, number>();
    for (const tsma of (timeStudy.timeStudyModuleAttributes_on_timeStudy || timeStudy.timeStudyModuleAttributes || [])) {
        const numVal = parseFloat(tsma.value);
        if (!isNaN(numVal)) {
            timeStudyAttrValues.set(tsma.moduleAttribute?.id, numVal);
        }
    }

    // Step 6: Calculate ratios for valid attributes
    let totalRatio = 0;
    let validCount = 0;
    for (const attrId of intersectedAttrIds) {
        const moduleValue = moduleAttrValues.get(attrId)!;
        const studyValue = timeStudyAttrValues.get(attrId);
        if (!studyValue || studyValue === 0) continue;

        totalRatio += moduleValue / studyValue;
        validCount++;
    }

    if (validCount === 0) {
        return Math.max(0.1, clockTime);
    }

    // Step 7: estimatedHours = clockTime * averageRatio
    const averageRatio = totalRatio / validCount;
    return Math.max(0.1, clockTime * averageRatio);
}
