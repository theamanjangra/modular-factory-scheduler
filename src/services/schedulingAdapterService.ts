import { PrismaClient } from '@prisma/client';
import {
    MultiShiftPlanRequest,
    Task,
    Worker,
    WorkerTask,
    DeficitTask,
    MultiShiftPlanResponse
} from '../types';
import { MultiShiftPlanningService } from './multiShiftPlanningService';
import { LaborEstimationService } from './laborEstimationService';

// --- External Input Interfaces (matching user spec) ---

export interface SimulationOptions {
    startTime?: string;
    endTime?: string;
    shift1StartTime?: string;
    shift1EndTime?: string;
    shift2StartTime?: string;
    shift2EndTime?: string;
    useShift2?: boolean;
    startingShiftPct?: number; // 0.0 - 1.0
    endingShiftPct?: number;
    startingShiftId?: string;
    endingShiftId?: string;
    limit?: number; // Limit number of tasks for preview
    // ... other frontend options
}

export interface ExternalSchedulingInput {
    startDate: string; // ISO String
    endDate: string;   // ISO String
    shifts: ExternalProductionPlanShift[];
    tasks: ExternalTask[];
    workers?: ExternalWorker[];
}

export interface ExternalWorker {
    id: string;
    name: string;
    shiftPreference?: string;
    skills?: string[];
    department?: { id: string; name?: string };
}

export interface ExternalProductionPlanShift {
    id: string;
    shift: {
        id: string;
        startTime: number; // TimeInterval (seconds from midnight)
        endTime: number;   // TimeInterval
        weekDayOrdinal: number;
    };
    productionRate?: number; // Optional override for explicit rate control
    // workerTasks and deficitTasks are output, usually empty on input or ignored
}

export interface ExternalTask {
    id: string;
    department: { id: string };
    traveler: { id: string };
    // Partial list from screenshot. 
    // We assume the upstream system also provides these required by Algo, 
    // or we default them.
    name?: string;
    estimatedLaborHours?: number;
    maxWorkers?: number;
    requiredSkills?: string[];
}

// --- Adapter Service ---

export class SchedulingAdapterService {
    private multiShiftPlanningService: MultiShiftPlanningService;

    constructor() {
        this.multiShiftPlanningService = new MultiShiftPlanningService();
    }

    public async run(input: ExternalSchedulingInput): Promise<MultiShiftPlanResponse> {
        console.log(`[Adapter] Receiving request for ${input.startDate} to ${input.endDate}`);
        console.log(`[Adapter] Shifts: ${input.shifts.length}, Tasks: ${input.tasks.length}`);

        // 1. Map Shifts to Internal "ShiftWindow" structure
        // The algorithm expects specific shift1/shift2 windows.
        // We need to create them from the list of ProductionPlanShifts.
        // Constraint: The current algorithm supports max 2 shifts per planning unit (Shift 1 / Shift 2).
        // If the upstream gives us 6 shifts (e.g. 3 days x 2 shifts), we might need to strictly 
        // filter or perhaps the algorithm runs only on a "Day" basis? 
        // Re-reading logic: The algorithm takes `intervalStart` and `intervalEnd`. 
        // It seems designed for a single "Production Day" loop.

        // HOWEVER, the user request says "Production Plan Generation" for a "Cycle" (multiple days).
        // If we simply pass all shifts to the current simple "Shift 1 / Shift 2" logic, it might break 
        // if they are on different days.

        // CRITICAL DECISION: The current `MultiShiftPlanningService` (which we invoke)
        // calculates `shift1` and `shift2` windows.
        // It seems to expect them to be the *same* recurring shift pattern or specific instances?
        // Let's look at `MultiShiftPlanRequest`:
        // shift1: ShiftPlanWindow { intervalStart, intervalEnd }

        // Strategy: 
        // The input `shifts` are explicit occurrences (ProductionPlanShift).
        // We should map the FIRST provided shift to `shift1` and SECOND to `shift2`.
        // If there are more, we might need to loop? 
        // But for now, let's assume the user runs this for a specific window that fits the algo capability (e.g. 1 day).
        // converting List -> Shift 1 / Shift 2.

        const sortedShifts = [...input.shifts].sort((a, b) => {
            // We don't have absolute dates in the Shift object shown in screenshot (only TimeInterval).
            // Wait, ProductionPlanShift usually links to a specific date or the Plan defines it.
            // The screenshot shows `ProductionPlanShift` has `shift` (template).
            // It does NOT show a specific `date` field on ProductionPlanShift in the screenshot struct `struct ProductionPlanShift`.
            // But the prompt says "The endpoint will... Construct ProductionPlanShift instances for each occurrence".
            // PRESUMABLY the input `shifts` array *implies* order or contains date info not shown in the partial struct.
            // OR, we assume they are provided in chronological order.
            return 0; // Assume strictly ordered by upstream
        });

        if (sortedShifts.length === 0) {
            throw new Error("No shifts provided in input.");
        }

        const s1 = sortedShifts[0];
        const s2 = sortedShifts.length > 1 ? sortedShifts[1] : undefined;

        // Helper to convert seconds-from-midnight to ISO time for the "ShiftWindow"
        // Since we don't have the date in the Shift struct, we rely on the `startDate` of the plan
        // to anchor the first shift? 
        // ACTUALLY, if `ProductionPlanShift` doesn't have a date, this is ambiguous.
        // But let's assume for the "Runner", the `shifts` passed in conform to the day.

        // Hack: Use the plan's startDate as the base date for the first shift?
        // Let's assume the upstream provides a robust list.
        // We will construct the internal request.

        // We explicitly map the "External Task" to "Internal Task"
        const mappedTasks: Task[] = input.tasks.map(t => ({
            taskId: t.id,
            name: t.name || `Task ${t.id.substring(0, 5)}`,
            // Defaulting duration if missing (User said partial struct, so likely missing in screenshot but present in reality)
            estimatedTotalLaborHours: t.estimatedLaborHours || 2.0,
            estimatedRemainingLaborHours: t.estimatedLaborHours || 2.0,
            maxWorkers: t.maxWorkers || 2,
            requiredSkills: t.requiredSkills || [], // Pass skills to algo
            departmentId: t.department.id, // Mapping strict ID
            // The algorithm might need more, but we start here.
        }));

        // Mocking Workers for now as they weren't in the "We will get" list explicitly?
        // Wait, "we will get tasks... workers?" 
        // The prompt says "get just fetch the following... [Task], [ProductionPlanShift], Start/End".
        // It does NOT mention Workers.
        // The algorithm NEEDS workers.
        // We must fetch active workers from the DB (as per the "Data Fetching" part of the implied deal) 
        // OR the adapter specifically handles the "Missing Workers" by fetching them?
        // The user said "generating the production plan is somebody else's work... we will get...". 
        // PROBABLY we assume the upstream provides workers too, OR we fetch them.
        // I will fetch them inside the adapter using the existing `Worker` types/service if needed,
        // or for now, pass empty and let the service fetch defaults.

        const s1Duration = s1.shift.endTime - s1.shift.startTime;
        const s2Duration = s2 ? (s2.shift.endTime - s2.shift.startTime) : 0;
        const totalDuration = s1Duration + s2Duration;

        // Default to 1.0 if total duration is 0 (edge case) or only 1 shift
        // Use explicit rate from input if available, otherwise calculate from duration
        const internalRequest: MultiShiftPlanRequest = {
            shifts: sortedShifts.map((s, index) => {
                const sDuration = s.shift.endTime - s.shift.startTime;

                // Rate calculation: Explicit > Proportional > Equal Split (Fallback)
                let rate = 1.0;
                if (s.productionRate !== undefined) {
                    rate = s.productionRate;
                } else if (totalDuration > 0) {
                    rate = sDuration / totalDuration;
                } else {
                    rate = 1.0 / sortedShifts.length;
                }

                return {
                    shiftId: s.shift.id,
                    productionRate: Number(rate.toFixed(4)),
                    shiftInterval: {
                        start: this.secondsToIso(s.shift.startTime, input.startDate),
                        end: this.secondsToIso(s.shift.endTime, input.startDate)
                    }
                };
            }),
            tasks: mappedTasks,
            workers: input.workers ? input.workers.map(w => ({
                workerId: w.id,
                name: w.name,
                departmentId: w.department?.id || undefined,
                skills: w.skills || [], // Pass skills or default
                shiftPreference: w.shiftPreference,
                availability: { startTime: new Date().toISOString(), endTime: new Date().toISOString() } // Will be overridden by resolver
            })) : [] // fallback to DB fetch if empty
        };

        return await this.multiShiftPlanningService.plan(internalRequest);
    }


    public async simulateFromDB(options?: SimulationOptions): Promise<MultiShiftPlanResponse> {
        const { addDays, startOfDay } = require('date-fns');
        console.log("[Adapter] Running Simulation from DB...", options ? "With Options" : "Defaults");

        const prisma = new PrismaClient();

        try {
            // 1. Fetch Workers
            const dbWorkers = await prisma.worker.findMany({
                include: { shift: true, workerDepartments: { include: { department: true } } }
            });
            const externalWorkers: ExternalWorker[] = dbWorkers.map(w => ({
                id: w.id,
                name: w.firstName + (w.lastName ? ' ' + w.lastName : ''),
                shiftPreference: w.shift?.name || undefined,
                skills: w.rankedSkills || [], // Map skills directly from Enum array
                department: w.workerDepartments?.[0]?.department ? {
                    id: w.workerDepartments[0].department.id,
                    name: w.workerDepartments[0].department.name || undefined
                } : undefined
            }));

            // 2. Fetch Active Tasks (Travelers not shipped, with open tasks)
            // We look for Tasks where traveler is not shipped.
            // Simplified: Fetch active travelers and their tasks.
            const travelers = await prisma.traveler.findMany({
                where: { isShipped: false },
                take: options?.limit, // Apply limit if provided
                include: {
                    tasks: {
                        where: { leadStatus: 'pending' }, // Only pending tasks
                        take: options?.limit, // Limit tasks inside traveler too!
                        include: {
                            taskTemplate: {
                                include: {
                                    department: true,
                                    timeStudies: { take: 1, orderBy: { date: 'desc' } }
                                }
                            }
                        }
                    },
                    moduleProfile: true
                }
            });

            const externalTasks: ExternalTask[] = [];
            for (const t of travelers) {
                for (const task of t.tasks) {
                    // Estimate? Use time study or template default. 
                    // Using template default maxWorkers/minWorkers to guess? 
                    // Or just default 4h as per mock
                    // Ideally we fetch TimeStudies or TaskTemplate duration. 
                    // TaskTemplate doesn't have duration in schema (checked earlier). TimeStudy does.
                    // We'll Default to 4.0h for demo.
                    externalTasks.push({
                        id: task.id,
                        department: { id: task.taskTemplate.departmentId },
                        traveler: { id: t.id },
                        name: `${task.taskTemplate.name} - ${t.moduleProfile?.name || 'Unit'}`,
                        estimatedLaborHours: task.taskTemplate.timeStudies?.[0]?.clockTime || 4.0,
                        maxWorkers: task.taskTemplate.maxWorkers || 2,
                        requiredSkills: task.taskTemplate.rankedSkills
                    });
                }
            }

            console.log(`[Adapter] Fetched ${externalWorkers.length} workers and ${externalTasks.length} tasks from DB.`);

            if (externalTasks.length === 0) {
                console.warn("[Adapter] No tasks found in DB. Falling back to mocks.");
                return this.simulate();
            }

            // 3. Generate Shifts (from Production Plan if available)
            const now = new Date();
            const shouldUseTomorrow = now.getHours() >= 7;
            const startDate = shouldUseTomorrow ? addDays(startOfDay(now), 1) : startOfDay(now);
            const shifts: ExternalProductionPlanShift[] = [];

            // Attempt to fetch relevant Production Plan (Get Latest Active)
            // Only if NO override options provided
            const plan = !options?.shift1StartTime ? await prisma.productionPlan.findFirst({
                include: { productionPlanShifts: { include: { shift: true } } },
                orderBy: { startDate: 'desc' }
            }) : null;

            if (options?.shift1StartTime) {
                console.log("[Adapter] Using Shifts from Options override.");
                // Option-based Layout (User selected manual times/rates)

                // Helper to parse ISO time to seconds from midnight
                const isoToSeconds = (iso: string) => {
                    const d = new Date(iso);
                    return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60;
                };

                const s1Start = isoToSeconds(options.shift1StartTime);
                const s1End = isoToSeconds(options.shift1EndTime!);

                shifts.push({
                    id: options.startingShiftId || 'shift-1',
                    shift: {
                        id: options.startingShiftId || 'shift-1',
                        startTime: s1Start,
                        endTime: s1End,
                        weekDayOrdinal: startDate.getDay() || 7
                    },
                    productionRate: options.startingShiftPct
                });

                if (options.useShift2 && options.shift2StartTime && options.shift2EndTime) {
                    const s2Start = isoToSeconds(options.shift2StartTime);
                    const s2End = isoToSeconds(options.shift2EndTime);
                    shifts.push({
                        id: options.endingShiftId || 'shift-2',
                        shift: {
                            id: options.endingShiftId || 'shift-2',
                            startTime: s2Start,
                            endTime: s2End,
                            weekDayOrdinal: startDate.getDay() || 7
                        },
                        productionRate: options.endingShiftPct
                    });
                }

                // TODO: If we want to support N shifts from options, we need to change options structure
                // For now, we stick to 2 shifts max from the "Quick Simulation" UI options, 
                // but the backend supports N.
            } else if (plan && plan.productionPlanShifts.length > 0) {
                console.log(`[Adapter] Found Plan ${plan.id} for simulation.`);
                for (const pps of plan.productionPlanShifts) {
                    // Convert DB Shift Time (1970-01-01) to seconds from midnight
                    const sTime = pps.shift.startTime ? new Date(pps.shift.startTime) : new Date('1970-01-01T07:00:00Z');
                    const eTime = pps.shift.endTime ? new Date(pps.shift.endTime) : new Date('1970-01-01T15:00:00Z');
                    const startSeconds = sTime.getUTCHours() * 3600 + sTime.getUTCMinutes() * 60;
                    const endSeconds = eTime.getUTCHours() * 3600 + eTime.getUTCMinutes() * 60;

                    shifts.push({
                        id: pps.id,
                        shift: {
                            id: pps.shift.id,
                            startTime: startSeconds,
                            endTime: endSeconds,
                            weekDayOrdinal: startDate.getDay() || 7 // Assuming strictly aligning to sim day
                        }
                    });
                }
            } else {
                console.warn("[Adapter] No Production Plan found covering today. Falling back to default shifts.");
                shifts.push({
                    id: `shift-1`,
                    shift: { id: `shift-1`, startTime: 7 * 3600, endTime: 15 * 3600, weekDayOrdinal: startDate.getDay() || 7 }
                });
                shifts.push({
                    id: `shift-2`,
                    shift: { id: `shift-2`, startTime: 15 * 3600, endTime: 23 * 3600, weekDayOrdinal: startDate.getDay() || 7 }
                });
            }

            // 4. Run
            const input: ExternalSchedulingInput = {
                startDate: startDate.toISOString(),
                endDate: addDays(startDate, 1).toISOString(),
                shifts: shifts,
                tasks: externalTasks,
                workers: externalWorkers
            };

            const result = await this.run(input);

            return {
                ...result,
                workers: input.workers!.map(w => ({
                    id: w.id,
                    name: w.name,
                    shiftPreference: w.shiftPreference,
                    department: w.department
                })),
                tasks: input.tasks.map(t => ({
                    id: t.id,
                    department: t.department,
                    traveler: t.traveler,
                    name: t.name,
                    estimatedTotalLaborHours: t.estimatedLaborHours,
                    estimatedRemainingLaborHours: t.estimatedLaborHours
                }))
            } as any;

        } catch (e) {
            console.error("DB Simulation Error", e);
            throw e;
        } finally {
            await prisma.$disconnect();
        }
    }

    public async simulateMixed(externalTasks: ExternalTask[], externalShifts?: ExternalProductionPlanShift[], options?: SimulationOptions): Promise<MultiShiftPlanResponse> {
        const { addDays, startOfDay } = require('date-fns');
        console.log("[Adapter] Running Mixed Simulation...", options ? "With Options" : "Defaults");

        const prisma = new PrismaClient();

        try {
            // 1. Fetch Workers (Same as simulateFromDB)
            const dbWorkers = await prisma.worker.findMany({
                include: { shift: true, workerDepartments: { include: { department: true } } }
            });
            const externalWorkers: ExternalWorker[] = dbWorkers.map(w => ({
                id: w.id,
                name: w.firstName + (w.lastName ? ' ' + w.lastName : ''),
                shiftPreference: w.shift?.name || undefined,
                skills: w.rankedSkills || [],
                department: w.workerDepartments?.[0]?.department ? {
                    id: w.workerDepartments[0].department.id,
                    name: w.workerDepartments[0].department.name || undefined
                } : undefined
            }));

            // 2. Use Provided Tasks
            if (!externalTasks || externalTasks.length === 0) {
                console.warn("[Adapter] No tasks provided in body. Falling back to mocks.");
                return this.simulate();
            }

            console.log(`[Adapter] Using ${externalTasks.length} provided tasks and ${externalWorkers.length} DB workers.`);

            // 2b. Estimate labor hours for tasks that don't have them
            const tasksNeedingEstimate = externalTasks.filter(t => !t.estimatedLaborHours || t.estimatedLaborHours <= 0);
            if (tasksNeedingEstimate.length > 0) {
                console.log(`[Adapter] ${tasksNeedingEstimate.length} tasks need labor estimation...`);
                const laborService = new LaborEstimationService(prisma);
                const estimates = await laborService.estimateLaborHours(tasksNeedingEstimate.map(t => t.id));
                for (const task of externalTasks) {
                    if (!task.estimatedLaborHours || task.estimatedLaborHours <= 0) {
                        task.estimatedLaborHours = estimates.get(task.id) || 1.0;
                    }
                }
            }

            // 3. Resolve Shifts
            // Priority: External Shifts > Options > Default
            const now = new Date();
            const shouldUseTomorrow = now.getHours() >= 7;
            const startDate = shouldUseTomorrow ? addDays(startOfDay(now), 1) : startOfDay(now);

            const shifts: ExternalProductionPlanShift[] = [];

            if (externalShifts && externalShifts.length > 0) {
                console.log("[Adapter] Using provided shifts.");
                shifts.push(...externalShifts);
            } else if (options?.shift1StartTime) {
                console.log("[Adapter] Using Shifts from Options override.");
                // Option-based Layout (User selected manual times/rates)
                // Helper to parse ISO time to seconds from midnight
                const isoToSeconds = (iso: string) => {
                    const d = new Date(iso);
                    return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60;
                };

                const s1Start = isoToSeconds(options.shift1StartTime);
                const s1End = isoToSeconds(options.shift1EndTime!);

                shifts.push({
                    id: options.startingShiftId || 'shift-1',
                    shift: {
                        id: options.startingShiftId || 'shift-1',
                        startTime: s1Start,
                        endTime: s1End,
                        weekDayOrdinal: startDate.getDay() || 7
                    },
                    productionRate: options.startingShiftPct
                });

                if (options.useShift2 && options.shift2StartTime && options.shift2EndTime) {
                    const s2Start = isoToSeconds(options.shift2StartTime);
                    const s2End = isoToSeconds(options.shift2EndTime);
                    shifts.push({
                        id: options.endingShiftId || 'shift-2',
                        shift: {
                            id: options.endingShiftId || 'shift-2',
                            startTime: s2Start,
                            endTime: s2End,
                            weekDayOrdinal: startDate.getDay() || 7
                        },
                        productionRate: options.endingShiftPct
                    });
                }
            } else {
                console.warn("[Adapter] No Shifts provided. Falling back to default shifts.");
                shifts.push({
                    id: `shift-1`,
                    shift: { id: `shift-1`, startTime: 7 * 3600, endTime: 15 * 3600, weekDayOrdinal: startDate.getDay() || 7 }
                });
                shifts.push({
                    id: `shift-2`,
                    shift: { id: `shift-2`, startTime: 15 * 3600, endTime: 23 * 3600, weekDayOrdinal: startDate.getDay() || 7 }
                });
            }

            // 4. Run
            const input: ExternalSchedulingInput = {
                startDate: startDate.toISOString(),
                endDate: addDays(startDate, 1).toISOString(),
                shifts: shifts,
                tasks: externalTasks, // Use passed tasks
                workers: externalWorkers // Use DB workers
            };

            const result = await this.run(input);

            return {
                ...result,
                workers: input.workers!.map(w => ({
                    id: w.id,
                    name: w.name,
                    shiftPreference: w.shiftPreference,
                    department: w.department
                })),
                tasks: input.tasks.map(t => ({
                    id: t.id,
                    department: t.department,
                    traveler: t.traveler,
                    name: t.name,
                    estimatedTotalLaborHours: t.estimatedLaborHours,
                    estimatedRemainingLaborHours: t.estimatedLaborHours
                }))
            } as any;

        } catch (e) {
            console.error("Mixed Simulation Error", e);
            throw e;
        } finally {
            await prisma.$disconnect();
        }
    }

    public async simulate(): Promise<MultiShiftPlanResponse> {
        const { addDays, setHours, setMinutes, startOfDay } = require('date-fns');

        console.log("[Adapter] Running Simulation (Mock Data)...");

        // Mocking 5 active tasks across 3 travelers
        // Mocking Active Tasks (Scaled to fill ~45 hours of work)
        const externalTasks: ExternalTask[] = [
            {
                id: "mock-task-1",
                department: { id: "dept-assembly" },
                traveler: { id: "trav-101" },
                name: "Assemble Chassis (Long)",
                estimatedLaborHours: 12.0 // Spans Shift 1 -> Shift 2
            },
            {
                id: "mock-task-2",
                department: { id: "dept-wiring" },
                traveler: { id: "trav-101" },
                name: "Install Main Harness",
                estimatedLaborHours: 8.0 // Full Shift 1
            },
            {
                id: "mock-task-3",
                department: { id: "dept-assembly" },
                traveler: { id: "trav-102" },
                name: "Mount Body Panels",
                estimatedLaborHours: 10.0 // Shift 1 -> Shift 2
            },
            {
                id: "mock-task-4",
                department: { id: "dept-paint" },
                traveler: { id: "trav-102" },
                name: "Prep for Paint",
                estimatedLaborHours: 6.0 // Partial Day
            },
            {
                id: "mock-task-5",
                department: { id: "dept-qa" },
                traveler: { id: "trav-103" },
                name: "Final Inspection",
                estimatedLaborHours: 4.0
            },
            {
                id: "mock-task-6",
                department: { id: "dept-trim" },
                traveler: { id: "trav-103" },
                name: "Interior Finishes",
                estimatedLaborHours: 5.0
            },
            {
                id: "mock-task-7",
                department: { id: "dept-qa" },
                traveler: { id: "trav-103" },
                name: "Road Test",
                estimatedLaborHours: 3.0
            }
        ];

        // Generate Shifts (Simulate Next 3 Days, 7am-3pm)
        const now = new Date();
        const shouldUseTomorrow = now.getHours() >= 7;
        const startDate = shouldUseTomorrow ? addDays(startOfDay(now), 1) : startOfDay(now);

        const shifts: ExternalProductionPlanShift[] = [];

        // Create 2 shifts for the SAME day to simulate a multi-shift day
        // ensuring the Adapter's "Shift 1 / Shift 2" logic picks them up correctly.
        // Shift 1: 07:00 - 15:00
        shifts.push({
            id: `shift-1`,
            shift: {
                id: `shift-1`, // ID used by resolving logic
                startTime: 7 * 3600,
                endTime: 15 * 3600,
                weekDayOrdinal: startDate.getDay() || 7
            }
        });

        // Shift 2: 15:00 - 23:00 (Example Second Shift)
        shifts.push({
            id: `shift-2`,
            shift: {
                id: `shift-2`, // ID used by resolving logic
                startTime: 15 * 3600,
                endTime: 23 * 3600,
                weekDayOrdinal: startDate.getDay() || 7
            }
        });

        // Mocking Workers
        const mockWorkers: ExternalWorker[] = [
            { id: "w-1", name: "Liam Neeson (Lead)", shiftPreference: "Shift 1" },
            { id: "w-2", name: "Sarah Connor (Structural)", shiftPreference: "Shift 1" },
            { id: "w-3", name: "Tony Stark (Electrical)", shiftPreference: "Shift 2" },
            { id: "w-4", name: "Ellen Ripley (QA)", shiftPreference: "Shift 2" },
            { id: "w-5", name: "Bruce Wayne (Floater)" }
        ];

        const input: ExternalSchedulingInput = {
            startDate: startDate.toISOString(),
            endDate: addDays(startDate, 1).toISOString(), // 1 Day Window
            shifts: shifts,
            tasks: externalTasks,
            workers: mockWorkers
        };

        const result = await this.run(input);

        // Enrich response with metadata for Frontend ID->Name mapping
        return {
            ...result,
            tasks: input.tasks.map(t => ({
                taskId: t.id,
                departmentId: t.department.id, // Pass departmentId to frontend
                name: t.name,
                estimatedTotalLaborHours: t.estimatedLaborHours,
                estimatedRemainingLaborHours: t.estimatedLaborHours
            })),
            workers: input.workers!.map(w => ({
                workerId: w.id,
                name: w.name,
                departmentId: w.department?.id || undefined,
                shiftPreference: w.shiftPreference
            }))
        } as any; // Cast to bypass strict MultiShiftPlanResponse which lacks tasks/workers
    }

    private secondsToIso(seconds: number, baseDateIso: string): string {
        const d = new Date(baseDateIso);
        d.setUTCHours(0, 0, 0, 0); // Reset to midnight of base date
        d.setUTCSeconds(seconds);
        return d.toISOString();
    }
}
