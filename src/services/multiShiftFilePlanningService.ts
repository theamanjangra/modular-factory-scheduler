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

    public async plan(request: MultiShiftFilePlanRequest & { shifts?: any[] }): Promise<{
        assignments: WorkerTask[];
        idleWorkers: WorkerTask[];
        deficitTasks: DeficitTask[];
        taskProgress?: any[];
    }> {
        console.log('--- STARTING DYNAMIC MULTI-SHIFT SIMULATION ---');

        // 0. Normalize Shifts Input
        let shifts: Array<{
            id: string;
            startTime: string; // ISO
            endTime: string;   // ISO
            productionRate?: number;
        }> = [];

        if (request.shifts && Array.isArray(request.shifts) && request.shifts.length > 0) {
            shifts = request.shifts;
        } else {
            // Fallback to Legacy Shift 1 / Shift 2
            const s1Rate = request.startingShiftPct || 1.0;
            shifts.push({
                id: 'shift-1',
                startTime: request.shift1Interval.startTime,
                endTime: request.shift1Interval.endTime,
                productionRate: s1Rate
            });

            if (request.shift2Interval) {
                shifts.push({
                    id: 'shift-2',
                    startTime: request.shift2Interval.startTime,
                    endTime: request.shift2Interval.endTime,
                    productionRate: request.endingShiftPct || (1.0 - s1Rate)
                });
            }
        }

        console.log(`Planned Shifts: ${shifts.length}`);

        // 1. Prepare Data
        const baseTasks = this.cloneTasks(request.tasks);
        const totalEstimatedHours = this.normalizeTaskEstimates(baseTasks);
        console.log(`Total Estimated Hours (Basis): ${totalEstimatedHours.toFixed(2)}`);

        const allAssignments: WorkerTask[] = [];
        const allIdle: WorkerTask[] = [];

        let currentRemainingMap = this.calculateRemainingHours(baseTasks, []); // Initial remaining = total

        // 2. Iterate Shifts
        for (let i = 0; i < shifts.length; i++) {
            const shift = shifts[i];
            const rate = shift.productionRate || 1.0;
            console.log(`>>> RUNNING SHIFT ${shift.id} (${shift.startTime} - ${shift.endTime}) <<<`);

            // Filter Workers for this shift
            const shiftWorkers = this.filterWorkersForShift(shift.id, request.workers).map(w => ({
                ...w,
                availability: { startTime: shift.startTime, endTime: shift.endTime }
            })) as Worker[];

            if (shiftWorkers.length === 0) {
                console.warn(`No workers found for shift ${shift.id}. Skipping.`);
                continue;
            }

            // Prepare Tasks with updated remaining hours
            const shiftTasks = this.cloneTasks(baseTasks).map(t => ({
                ...t,
                estimatedRemainingLaborHours: currentRemainingMap.get(t.taskId) || 0
            })).filter(t => (t.estimatedRemainingLaborHours || 0) > 0.001); // Only tasks with work left

            if (shiftTasks.length === 0) {
                console.log(`No remaining work for shift ${shift.id}.`);
                continue;
            }

            // Execute Planning
            const shiftRequest: PlanRequest = {
                workers: shiftWorkers,
                tasks: shiftTasks,
                interval: { startTime: shift.startTime, endTime: shift.endTime },
                useHistorical: false,
                scheduling: request.scheduling
            };

            const steps = await this.planningService.plan(shiftRequest);
            const agg = aggregateSchedule(steps);

            const assignments = agg.assignments.map(a => ({
                workerId: a.workerId,
                taskId: a.taskId,
                startDate: a.startDate,
                endDate: a.endDate,
                shiftId: shift.id, // Stamp Shift ID
                isWaitTask: (a as any).isWaitTask
            })) as WorkerTask[];

            const idle = steps.filter(s => s.type === 'worker_idle').map(s => ({
                workerId: s.workerId!,
                taskId: null,
                startDate: s.startDate,
                endDate: s.endDate,
                shiftId: shift.id
            })) as WorkerTask[];

            allAssignments.push(...assignments);
            allIdle.push(...idle);

            // Update Remaining Map for next shift
            // We calculate remaining based on *accumulated* assignments so far to avoid drift? 
            // Or just subtract what we just did?
            // Safer to recalculate from baseTasks and ALL assignments to date.
            currentRemainingMap = this.calculateRemainingHours(baseTasks, allAssignments);

            // 3. GAP SIMULATION (Logic between this shift and next)
            // If there is a next shift, check for gap
            if (i < shifts.length - 1) {
                const nextShift = shifts[i + 1];
                const currentEnd = new Date(shift.endTime).getTime();
                const nextStart = new Date(nextShift.startTime).getTime();
                const gapMs = nextStart - currentEnd;
                const gapHours = Math.max(0, gapMs / (1000 * 60 * 60));

                if (gapHours > 0.01) {
                    console.log(`Gap Duration after ${shift.id}: ${gapHours.toFixed(2)} hours`);

                    // Process Non-Worker Tasks (Drying/Curing)
                    baseTasks.forEach(task => {
                        const isNonWorker = task.taskType === 'nonWorker' || (task.minWorkers === 0 && task.maxWorkers === 0);
                        if (isNonWorker) {
                            // Check Prerequisites
                            const prerequisiteIds = task.prerequisiteTaskIds || [];
                            const prereqsComplete = prerequisiteIds.every(pid => {
                                const rem = currentRemainingMap.get(pid) || 0;
                                return rem <= 0.01;
                            });

                            if (prereqsComplete) {
                                const currentRem = currentRemainingMap.get(task.taskId) || 0;
                                if (currentRem > 0) {
                                    const deduction = Math.min(currentRem, gapHours);

                                    // Add Virtual Assignment
                                    if (deduction > 0) {
                                        const gStart = currentEnd;
                                        const durMs = deduction * 60 * 60 * 1000;
                                        allAssignments.push({
                                            workerId: null,
                                            taskId: task.taskId,
                                            shiftId: 'GAP',
                                            startDate: new Date(gStart).toISOString(),
                                            endDate: new Date(gStart + durMs).toISOString(),
                                            isWaitTask: true
                                        } as any);

                                        // Update remaining map immediately for this task
                                        const newRem = currentRem - deduction;
                                        currentRemainingMap.set(task.taskId, newRem);
                                    }
                                }
                            }
                        }
                    });
                }
            }
        }

        // 4. Final Deficits
        const deficitTasks = baseTasks
            .filter(task => (currentRemainingMap.get(task.taskId) || 0) > 0.1)
            .map(task => ({
                taskId: task.taskId,
                deficitHours: currentRemainingMap.get(task.taskId) || 0,
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
