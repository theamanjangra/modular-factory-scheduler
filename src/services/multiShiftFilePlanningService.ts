import { MultiShiftFilePlanRequest, PlanRequest, Task, Worker, WorkerTask, DeficitTask } from '../types';
import { PlanningService } from './planningService';
import { computeEstimatedTotalLaborHours } from '../utils/estimation';
import { aggregateSchedule } from '../utils/scheduleAggregator';

class MultiShiftFileValidationError extends Error {
    statusCode = 400;
}

type ManualShiftWindow = {
    shiftId: string;
    intervalStart: Date;
    intervalEnd: Date;
    productionRate: number;
    workers: Worker[];
};

export class MultiShiftFilePlanningService {
    private planningService: PlanningService;

    constructor() {
        this.planningService = new PlanningService();
    }

    public async plan(request: MultiShiftFilePlanRequest): Promise<{
        assignments: WorkerTask[];
        idleWorkers: WorkerTask[];
        deficitTasks: DeficitTask[];
        taskProgress?: any[];
    }> {
        console.log('--- STARTING SPLIT MULTI-SHIFT SIMULATION ---');
        const shift1Rate = request.startingShiftPct || 1.0;
        const shift2Rate = request.endingShiftPct || 0.0; // might be unused if we just take "remainder"

        // 1. Prepare Workers & Intervals
        // Shift 1
        const s1Start = new Date(request.shift1Interval.startTime);
        const s1End = new Date(request.shift1Interval.endTime);
        const shift1Workers = this.filterWorkersForShift('shift-1', request.workers).map(w => ({
            ...w,
            availability: { startTime: s1Start.toISOString(), endTime: s1End.toISOString() }
        })) as Worker[];

        // Shift 2
        let s2Start: Date | undefined;
        let s2End: Date | undefined;
        let shift2Workers: Worker[] = [];

        if (request.shift2Interval) {
            s2Start = new Date(request.shift2Interval.startTime);
            s2End = new Date(request.shift2Interval.endTime);
            shift2Workers = this.filterWorkersForShift('shift-2', request.workers).map(w => ({
                ...w,
                availability: { startTime: s2Start!.toISOString(), endTime: s2End!.toISOString() }
            })) as Worker[];
        }

        // 2. Prepare Tasks & Budget (Budget used only for target logging now)
        const baseTasks = this.cloneTasks(request.tasks);
        const totalEstimatedHours = this.normalizeTaskEstimates(baseTasks);
        console.log(`Total Estimated Hours (Basis): ${totalEstimatedHours.toFixed(2)}`);

        // Calculate Shift 1 Budget Target (Informational)
        const shift1Budget = Math.max(0.1, totalEstimatedHours * shift1Rate);
        console.log(`Shift 1 Target Goal (${(shift1Rate * 100).toFixed(1)}%): ${shift1Budget.toFixed(2)} hours (Not enforced as hard limit)`);

        // 3. EXECUTE SHIFT 1
        console.log(`>>> RUNNING SHIFT 1 <<<`);
        const s1Request: PlanRequest = {
            workers: shift1Workers,
            tasks: baseTasks,
            interval: { startTime: s1Start.toISOString(), endTime: s1End.toISOString() },
            useHistorical: false,
            scheduling: request.scheduling
            // workBudgetHours removed to prevent artificial idle time
        };
        const s1Steps = await this.planningService.plan(s1Request);
        const s1Agg = aggregateSchedule(s1Steps);
        const s1Assignments = s1Agg.assignments.map(a => ({
            workerId: a.workerId,
            taskId: a.taskId,
            startDate: a.startDate,
            endDate: a.endDate,
            isWaitTask: (a as any).isWaitTask
        })) as WorkerTask[];
        const s1Idle = s1Steps.filter(s => s.type === 'worker_idle').map(s => ({
            workerId: s.workerId!,
            taskId: null,
            startDate: s.startDate,
            endDate: s.endDate
        })) as WorkerTask[];

        // 4. Update Task State for Shift 2
        // We must calculate how much work was ACTUALLY done in Shift 1
        // and update the task definitions for Shift 2.
        const remainingMap = this.calculateRemainingHours(baseTasks, s1Assignments);

        // 5. GAP SIMULATION (Overnight Logic)
        // Non-Worker tasks (drying/curing) should continue to progress during the gap between Shift 1 and Shift 2.
        let gapHours = 0;
        if (s2Start && s1End) {
            const gapMs = s2Start.getTime() - s1End.getTime();
            gapHours = Math.max(0, gapMs / (1000 * 60 * 60));
        }

        if (gapHours > 0) {
            console.log(`Gap Duration: ${gapHours.toFixed(2)} hours`);
            baseTasks.forEach(task => {
                // Check if Non-Worker Task
                const isNonWorker = task.taskType === 'nonWorker' || (task.minWorkers === 0 && task.maxWorkers === 0);

                if (isNonWorker) {
                    // FIX 1: Check Prerequisites
                    const prereqsComplete = !task.prerequisiteTaskIds ||
                        task.prerequisiteTaskIds.every(prereqId => {
                            const prereqRemaining = remainingMap.get(prereqId) || 0;
                            // Tolerance for float precision
                            return prereqRemaining <= 0.01;
                        });

                    if (prereqsComplete) {
                        const currentRemaining = remainingMap.get(task.taskId) || 0;
                        if (currentRemaining > 0) {
                            const deduction = Math.min(currentRemaining, gapHours);
                            const newRemaining = currentRemaining - deduction;
                            remainingMap.set(task.taskId, newRemaining);
                            console.log(`Processed Gap for Task ${task.name}: ${currentRemaining.toFixed(2)} -> ${newRemaining.toFixed(2)} (Deducted ${deduction.toFixed(2)})`);

                            // FIX 3: Create Virtual Assignment for Controller Visibility
                            if (deduction > 0) {
                                // Gap effectively starts at Shift 1 End
                                const gapStart = s1End.getTime();
                                const durationMs = deduction * 60 * 60 * 1000;
                                s1Assignments.push({
                                    workerId: null, // Virtual assignment
                                    taskId: task.taskId,
                                    startDate: new Date(gapStart).toISOString(),
                                    endDate: new Date(gapStart + durationMs).toISOString(),
                                    isWaitTask: true
                                } as any);
                            }
                        }
                    } else {
                        console.log(`Skipping Gap for ${task.name}: Prereqs not ready.`);
                    }
                }
            });
        }

        // 6. EXECUTE SHIFT 2 (if exists)
        let s2Assignments: WorkerTask[] = [];
        let s2Idle: WorkerTask[] = [];

        if (s2Start && s2End && shift2Workers.length > 0) {
            // Create new Task objects with updated Remaining Hours
            const shift2Tasks = this.cloneTasks(baseTasks).map(t => ({
                ...t,
                estimatedRemainingLaborHours: remainingMap.get(t.taskId) || 0
            }));
            // DO NOT FILTER out finished tasks; they are needed for dependency resolution.

            if (shift2Tasks.some(t => (t.estimatedRemainingLaborHours || 0) > 0)) {
                // If we simply pass "remaining" budget, it might be huge if estimates were off.
                // Just let Shift 2 run until time runs out or work finishes.
                // Or should we enforce shift2Rate? 
                // Usually Shift 2 is "finish the rest" or "do up to X%".
                // If user said 55/45, and Shift 1 did 55, Shift 2 should try to do 45.
                // But budget is optional in PlanRequest. If omitted, it runs til completion/time.
                // Let's omit budget for Shift 2 to allow "catch up" unless strictly constrained?
                // Given the user issue was "Shift 2 empty", let's be generous.

                console.log(`Debug S2 Workers: ${shift2Workers.length}`);
                if (shift2Workers.length > 0) {
                    console.log(`S2 Worker 0 Avail: ${JSON.stringify(shift2Workers[0].availability)}`);
                    console.log(`S2 Worker 0 Pref: ${shift2Workers[0].shiftPreference}`);
                }
                console.log(`Debug S2 Tasks: ${shift2Tasks.length}`);
                console.log(`S2 Task 0 Remaining: ${shift2Tasks[0].estimatedRemainingLaborHours}`);
                console.log(`S2 Task 0 Type: ${shift2Tasks[0].taskType}`);

                const s2Request: PlanRequest = {
                    workers: shift2Workers,
                    tasks: shift2Tasks,
                    interval: { startTime: s2Start.toISOString(), endTime: s2End.toISOString() },
                    useHistorical: false,
                    scheduling: request.scheduling
                    // workBudgetHours: ... // Optional
                };
                const s2Steps = await this.planningService.plan(s2Request);
                const s2Agg = aggregateSchedule(s2Steps);
                s2Assignments = s2Agg.assignments.map(a => ({
                    workerId: a.workerId,
                    taskId: a.taskId,
                    startDate: a.startDate,
                    endDate: a.endDate,
                    isWaitTask: (a as any).isWaitTask
                })) as WorkerTask[];
                s2Idle = s2Steps.filter(s => s.type === 'worker_idle').map(s => ({
                    workerId: s.workerId!,
                    taskId: null,
                    startDate: s.startDate,
                    endDate: s.endDate
                })) as WorkerTask[];
            } else {
                console.log("No work remaining for Shift 2.");
            }
        }

        // 6. Merge Results
        const allAssignments = [...s1Assignments, ...s2Assignments];
        const allIdle = [...s1Idle, ...s2Idle];

        // 7. Final Deficits
        const finalRemainingMap = this.calculateRemainingHours(baseTasks, allAssignments);
        const deficitTasks = baseTasks
            .filter(task => (finalRemainingMap.get(task.taskId) || 0) > 0.1)
            .map(task => ({
                taskId: task.taskId,
                deficitHours: finalRemainingMap.get(task.taskId) || 0,
                requiredSkills: task.requiredSkills
            }));

        return {
            assignments: allAssignments,
            idleWorkers: allIdle,
            deficitTasks
        };
    }

    private filterWorkersForShift(shiftId: string, workers: Worker[]): Worker[] {
        const normalizedShiftId = shiftId.toLowerCase();
        let filtered = workers.filter(w => {
            if (!w.shiftPreference) return true;
            return w.shiftPreference.toLowerCase() === normalizedShiftId;
        });
        // Fallback: If no workers match explicit preference, assume all are available (legacy logic)
        if (filtered.length === 0) return workers;
        return filtered;
    }

    private normalizeTaskEstimates(tasks: Task[]): number {
        let totalRemaining = 0;
        tasks.forEach(task => {
            if (task.estimatedTotalLaborHours === undefined) {
                const computed = computeEstimatedTotalLaborHours(task);
                if (typeof computed === 'number') {
                    task.estimatedTotalLaborHours = computed;
                } else {
                    const base = task.minWorkers ? task.minWorkers * 4 : 4;
                    task.estimatedTotalLaborHours = base;
                }
            }
            if (task.estimatedRemainingLaborHours === undefined) {
                task.estimatedRemainingLaborHours = task.estimatedTotalLaborHours;
            }
            totalRemaining += task.estimatedRemainingLaborHours || 0;
        });
        return totalRemaining;
    }

    private calculateRemainingHours(tasks: Task[], assignments: WorkerTask[]): Map<string, number> {
        const remaining = new Map<string, number>();
        const epsilonHours = 0.0001;
        tasks.forEach(task => {
            remaining.set(task.taskId, task.estimatedRemainingLaborHours || 0);
        });

        assignments.forEach(assignment => {
            if (!assignment.taskId) return;
            const start = new Date(assignment.startDate).getTime();
            const end = new Date(assignment.endDate).getTime();
            const hours = Math.max(0, (end - start) / (1000 * 60 * 60));
            const current = remaining.get(assignment.taskId) || 0;
            const updated = Math.max(0, current - hours);
            remaining.set(assignment.taskId, updated <= epsilonHours ? 0 : updated);
        });

        return remaining;
    }

    private cloneTasks(tasks: Task[]): Task[] {
        return tasks.map(task => ({
            ...task,
            prerequisiteTaskIds: task.prerequisiteTaskIds ? [...task.prerequisiteTaskIds] : undefined,
            moduleAttributes: task.moduleAttributes ? [...task.moduleAttributes] : undefined,
            taskTemplateAttributeIds: task.taskTemplateAttributeIds ? [...task.taskTemplateAttributeIds] : undefined,
            timeStudy: task.timeStudy ? { ...task.timeStudy, attributes: [...task.timeStudy.attributes] } : undefined
        }));
    }
}
