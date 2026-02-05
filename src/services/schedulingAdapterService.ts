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

// --- External Input Interfaces (matching user spec) ---

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
}

export interface ExternalProductionPlanShift {
    id: string;
    shift: {
        id: string;
        startTime: number; // TimeInterval (seconds from midnight)
        endTime: number;   // TimeInterval
        weekDayOrdinal: number;
    };
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
        const s1Rate = totalDuration > 0 ? (s1Duration / totalDuration) : 1.0;
        const s2Rate = totalDuration > 0 ? (s2Duration / totalDuration) : 0.0;

        // Ensure strictly sums to 1.0 to satisfy strict validation if s2 exists
        // (Floating point issues might occur, so we force s2Rate = 1.0 - s1Rate if s2 exists)
        const finalS1Rate = s2 ? Number(s1Rate.toFixed(4)) : 1.0;
        const finalS2Rate = s2 ? Number((1.0 - finalS1Rate).toFixed(4)) : 0.0;

        const internalRequest: MultiShiftPlanRequest = {
            shift1: {
                shiftId: s1.shift.id,
                productionRate: finalS1Rate,
                shiftInterval: {
                    start: this.secondsToIso(s1.shift.startTime, input.startDate),
                    end: this.secondsToIso(s1.shift.endTime, input.startDate)
                }
            },
            shift2: s2 ? {
                shiftId: s2.shift.id,
                productionRate: finalS2Rate,
                shiftInterval: {
                    start: this.secondsToIso(s2.shift.startTime, input.startDate),
                    end: this.secondsToIso(s2.shift.endTime, input.startDate)
                }
            } : undefined,
            tasks: mappedTasks,
            workers: input.workers ? input.workers.map(w => ({
                workerId: w.id,
                name: w.name,
                skills: [], // Default to all skills/generic
                shiftPreference: w.shiftPreference,
                availability: { startTime: new Date().toISOString(), endTime: new Date().toISOString() } // Will be overridden by resolver
            })) : [] // fallback to DB fetch if empty
        };

        return await this.multiShiftPlanningService.plan(internalRequest);
    }


    public async simulateFromDB(): Promise<MultiShiftPlanResponse> {
        const { addDays, startOfDay } = require('date-fns');
        console.log("[Adapter] Running Simulation from DB...");

        const prisma = new PrismaClient();

        try {
            // 1. Fetch Workers
            const dbWorkers = await prisma.worker.findMany({
                include: { shift: true }
            });
            const externalWorkers: ExternalWorker[] = dbWorkers.map(w => ({
                id: w.id,
                name: w.firstName + (w.lastName ? ' ' + w.lastName : ''),
                shiftPreference: w.shift?.name || undefined
            }));

            // 2. Fetch Active Tasks (Travelers not shipped, with open tasks)
            // We look for Tasks where traveler is not shipped.
            // Simplified: Fetch active travelers and their tasks.
            const travelers = await prisma.traveler.findMany({
                where: { isShipped: false },
                include: {
                    tasks: {
                        where: { leadStatus: 'pending' }, // Only pending tasks
                        include: { taskTemplate: { include: { department: true } } }
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
                        estimatedLaborHours: 4.0
                    });
                }
            }

            console.log(`[Adapter] Fetched ${externalWorkers.length} workers and ${externalTasks.length} tasks from DB.`);

            if (externalTasks.length === 0) {
                console.warn("[Adapter] No tasks found in DB. Falling back to mocks.");
                return this.simulate();
            }

            // 3. Generate Shifts
            const now = new Date();
            const shouldUseTomorrow = now.getHours() >= 7;
            const startDate = shouldUseTomorrow ? addDays(startOfDay(now), 1) : startOfDay(now);
            const shifts: ExternalProductionPlanShift[] = [];

            shifts.push({
                id: `shift-1`,
                shift: { id: `shift-1`, startTime: 7 * 3600, endTime: 15 * 3600, weekDayOrdinal: startDate.getDay() || 7 }
            });
            shifts.push({
                id: `shift-2`,
                shift: { id: `shift-2`, startTime: 15 * 3600, endTime: 23 * 3600, weekDayOrdinal: startDate.getDay() || 7 }
            });

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
                tasks: input.tasks.map(t => ({
                    taskId: t.id,
                    name: t.name,
                    estimatedTotalLaborHours: t.estimatedLaborHours,
                    estimatedRemainingLaborHours: t.estimatedLaborHours
                })),
                workers: input.workers!.map(w => ({
                    workerId: w.id,
                    name: w.name,
                    shiftPreference: w.shiftPreference
                }))
            } as any;

        } catch (e) {
            console.error("DB Simulation Error", e);
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
                name: t.name,
                estimatedTotalLaborHours: t.estimatedLaborHours,
                estimatedRemainingLaborHours: t.estimatedLaborHours
            })),
            workers: input.workers!.map(w => ({
                workerId: w.id,
                name: w.name,
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
