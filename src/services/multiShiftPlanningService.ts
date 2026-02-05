import {
    MultiShiftPlanRequest,
    PlanRequest,
    Task,
    Worker,
    WorkerTask,
    DeficitTask,
    MultiShiftPlanResponse,
    TaskShiftProgress,
    ShiftSummary,
    ShiftCompletionViolation
} from '../types';
import { PlanningService } from './planningService';
import { computeEstimatedTotalLaborHours } from '../utils/estimation';
import { getShiftById, getWorkersNameWithShiftId, buildDefaultShift, ShiftInfo } from '../queries/shift.query';

class MultiShiftValidationError extends Error {
    statusCode = 400;
}

type ShiftWindow = {
    shiftId: string;
    intervalStart: Date;
    intervalEnd: Date;
    productionRate: number;
    workers: Worker[];
};

export class MultiShiftPlanningService {
    private planningService: PlanningService;

    constructor() {
        this.planningService = new PlanningService();
    }

    public async plan(request: MultiShiftPlanRequest): Promise<MultiShiftPlanResponse> {
        const shift1Rate = request.shift1.productionRate;
        if (typeof shift1Rate !== 'number') {
            throw new MultiShiftValidationError('shift1.productionRate is required.');
        }
        if (shift1Rate <= 0.0 || shift1Rate > 1.0) {
            throw new MultiShiftValidationError('shift1.productionRate must be > 0.0 and <= 1.0.');
        }

        const shift2Rate = 1.0 - shift1Rate;
        if (shift1Rate < 1.0 && !request.shift2) {
            throw new MultiShiftValidationError('shift2 is required when shift1.productionRate < 1.0.');
        }
        if (request.shift2?.productionRate !== undefined) {
            const epsilon = 0.0001;
            if (Math.abs(request.shift2.productionRate - shift2Rate) > epsilon) {
                throw new MultiShiftValidationError('shift2.productionRate must equal 1.0 - shift1.productionRate.');
            }
        }

        const shift1 = await this.resolveShiftWindow(request.shift1, shift1Rate, request.workers);
        const shift2 = request.shift2 && shift2Rate > 0
            ? await this.resolveShiftWindow(request.shift2, shift2Rate, request.workers)
            : undefined;

        const baseTasks = this.cloneTasks(request.tasks);
        const totalRemainingHours = this.normalizeTaskEstimates(baseTasks);

        const shift1Budget = totalRemainingHours * shift1.productionRate;
        const shift1Steps = this.runShiftPlan(shift1, baseTasks, shift1Budget);

        const remainingAfterShift1 = this.calculateRemainingHours(baseTasks, shift1Steps.assignments);

        let shift2Steps = { assignments: [] as WorkerTask[], idleWorkers: [] as WorkerTask[] };
        if (shift2) {
            const shift2Tasks = this.cloneTasks(baseTasks).map(task => ({
                ...task,
                estimatedRemainingLaborHours: remainingAfterShift1.get(task.taskId) || 0
            }));
            const shift2Budget = totalRemainingHours * shift2.productionRate;
            shift2Steps = this.runShiftPlan(shift2, shift2Tasks, shift2Budget);
        }

        const allAssignments = [...shift1Steps.assignments, ...shift2Steps.assignments];
        const finalRemaining = this.calculateRemainingHours(baseTasks, allAssignments);

        const deficitTasks: DeficitTask[] = baseTasks
            .filter(task => (finalRemaining.get(task.taskId) || 0) > 0)
            .map(task => ({
                taskId: task.taskId,
                deficitHours: finalRemaining.get(task.taskId) || 0
            }));

        // Calculate task progress across shifts
        const taskProgress = this.calculateTaskProgress(
            baseTasks,
            shift1Steps.assignments,
            shift2Steps.assignments
        );

        // Generate shift summaries
        const shift1Summary = this.summarizeShift(
            shift1.shiftId,
            shift1.productionRate,
            baseTasks,
            shift1Steps.assignments
        );

        const shift2Summary = shift2
            ? this.summarizeShift(
                shift2.shiftId,
                shift2.productionRate,
                baseTasks,
                shift2Steps.assignments,
                remainingAfterShift1
            )
            : undefined;

        // Check for shift completion violations
        const violations = this.checkViolations(baseTasks, taskProgress);

        // Generate warnings for soft constraint violations
        const warnings: string[] = [];
        taskProgress.forEach(progress => {
            if (progress.shiftCompletionPreference === 'prefersCompleteWithinShift' &&
                progress.completedInShift === 'spans_shifts') {
                warnings.push(
                    `Task ${progress.taskId}${progress.taskName ? ` (${progress.taskName})` : ''} ` +
                    `has prefersCompleteWithinShift but spans shifts`
                );
            }
        });

        return {
            assignments: allAssignments,
            idleWorkers: [...shift1Steps.idleWorkers, ...shift2Steps.idleWorkers],
            deficitTasks,
            taskProgress,
            shift1Summary,
            shift2Summary,
            violations,
            warnings
        };
    }

    private runShiftPlan(shift: ShiftWindow, tasks: Task[], workBudgetHours: number) {
        const planRequest: PlanRequest = {
            workers: shift.workers,
            tasks,
            interval: {
                startTime: shift.intervalStart.toISOString(),
                endTime: shift.intervalEnd.toISOString()
            },
            useHistorical: false,
            workBudgetHours
        };

        const rawSteps = this.planningService.plan(planRequest);
        return {
            assignments: rawSteps
                .filter(step => step.type === 'assignment')
                .map(step => ({
                    workerId: step.workerId,
                    taskId: step.taskId,
                    startDate: step.startDate,
                    endDate: step.endDate
                })) as WorkerTask[],
            idleWorkers: rawSteps
                .filter(step => step.type === 'worker_idle')
                .map(step => ({
                    workerId: step.workerId,
                    taskId: null,
                    startDate: step.startDate,
                    endDate: step.endDate
                })) as WorkerTask[]
        };
    }

    private async resolveShiftWindow(input: MultiShiftPlanRequest['shift1'], productionRate: number, providedWorkers?: Worker[]): Promise<ShiftWindow> {
        const shift = await getShiftById(input.shiftId) || buildDefaultShift(input.shiftId, input.shiftInterval.start);
        if (!shift) {
            throw new MultiShiftValidationError(`Shift not found: ${input.shiftId}`);
        }

        const shiftStart = new Date(shift.startTime);
        const shiftEnd = new Date(shift.endTime);
        const intervalStart = this.parseShiftTime(shiftStart, input.shiftInterval.start);
        const intervalEnd = this.parseShiftTime(shiftStart, input.shiftInterval.end);

        if (!(intervalStart < intervalEnd)) {
            throw new MultiShiftValidationError('shiftInterval.start must be before shiftInterval.end.');
        }
        // Clamp interval to shift bounds to avoid timezone/off-by-day issues from upstream data
        const clampedStart = new Date(Math.max(intervalStart.getTime(), shiftStart.getTime()));
        const clampedEnd = new Date(Math.min(intervalEnd.getTime(), shiftEnd.getTime()));
        if (!(clampedStart < clampedEnd)) {
            throw new MultiShiftValidationError('shiftInterval must overlap with the shift start/end time.');
        }

        let workers: Worker[] = [];

        if (providedWorkers && providedWorkers.length > 0) {
            // Filter provided workers by shift ID preference if specified, otherwise include all or use heuristic
            // For now, if provided workers exist, we filter them based on matching the shiftId if possible 
            // OR if the user intends simpler logic: just split them? 
            // Let's assume workers in Excel might have "Shift 1" or "Shift 2" as preference.

            // Normalize shiftId for comparison (e.g. "shift-1" -> "1")
            const targetShift = input.shiftId.replace('shift-', '');

            workers = providedWorkers.filter(w => {
                if (!w.shiftPreference) return true; // No preference = available for any
                const pref = w.shiftPreference.toLowerCase().replace('shift', '').trim().replace('-', '');
                return pref === targetShift;
            }).map(w => ({
                ...w,
                availability: {
                    startTime: clampedStart.toISOString(),
                    endTime: clampedEnd.toISOString()
                }
            }));

            // If filtering results in 0 workers, fallback to all (soft preference) or keep 0?
            // Let's fallback to all provided workers if none match strict preference, to avoid empty shift.
            if (workers.length === 0) {
                workers = providedWorkers.map(w => ({
                    ...w,
                    availability: {
                        startTime: clampedStart.toISOString(),
                        endTime: clampedEnd.toISOString()
                    }
                }));
            }

        } else {
            const workerResponse = await getWorkersNameWithShiftId(input.shiftId);
            const workersRaw = (workerResponse as any)?.workers || (workerResponse as any)?.data?.workers || [];

            workers = workersRaw.map((worker: any) => ({
                workerId: worker.id,
                name: [worker.firstName, worker.lastName].filter(Boolean).join(' ').trim(),
                skills: [],
                availability: {
                    startTime: clampedStart.toISOString(),
                    endTime: clampedEnd.toISOString()
                }
            }));
        }

        return {
            shiftId: input.shiftId,
            intervalStart: clampedStart,
            intervalEnd: clampedEnd,
            productionRate,
            workers
        };
    }

    private parseShiftTime(baseDate: Date, value: string): Date {
        if (value.includes('T')) {
            return new Date(value);
        }

        const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
        if (!match) {
            throw new MultiShiftValidationError(`Invalid shift interval time: ${value}`);
        }
        const hour = Number(match[1]);
        const minute = Number(match[2]);

        return new Date(Date.UTC(
            baseDate.getUTCFullYear(),
            baseDate.getUTCMonth(),
            baseDate.getUTCDate(),
            hour,
            minute,
            0,
            0
        ));
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

    /**
     * Calculate task progress across shifts
     */
    private calculateTaskProgress(
        tasks: Task[],
        shift1Assignments: WorkerTask[],
        shift2Assignments: WorkerTask[]
    ): TaskShiftProgress[] {
        return tasks.map(task => {
            const shift1Hours = this.sumAssignmentHours(shift1Assignments, task.taskId);
            const shift2Hours = this.sumAssignmentHours(shift2Assignments, task.taskId);
            const totalRequiredHours = task.estimatedTotalLaborHours || 0;
            const completedHours = shift1Hours + shift2Hours;
            const completionPercentage = totalRequiredHours > 0
                ? Math.min(100, (completedHours / totalRequiredHours) * 100)
                : 0;

            let completedInShift: 'shift1' | 'shift2' | 'spans_shifts' | 'incomplete';
            if (completionPercentage >= 99.9) {
                if (shift1Hours > 0 && shift2Hours > 0) {
                    completedInShift = 'spans_shifts';
                } else if (shift1Hours > 0) {
                    completedInShift = 'shift1';
                } else {
                    completedInShift = 'shift2';
                }
            } else {
                completedInShift = 'incomplete';
            }

            return {
                taskId: task.taskId,
                taskName: task.name,
                shift1Hours,
                shift2Hours,
                totalRequiredHours,
                completionPercentage,
                completedInShift,
                shiftCompletionPreference: task.shiftCompletionPreference
            };
        });
    }

    /**
     * Sum assignment hours for a specific task
     */
    private sumAssignmentHours(assignments: WorkerTask[], taskId: string): number {
        return assignments
            .filter(a => a.taskId === taskId)
            .reduce((sum, a) => {
                const start = new Date(a.startDate).getTime();
                const end = new Date(a.endDate).getTime();
                return sum + Math.max(0, (end - start) / (1000 * 60 * 60));
            }, 0);
    }

    /**
     * Generate summary for a shift
     */
    private summarizeShift(
        shiftId: string,
        productionRate: number,
        tasks: Task[],
        assignments: WorkerTask[],
        remainingAtStart?: Map<string, number>
    ): ShiftSummary {
        const taskHours = new Map<string, number>();
        let totalHoursWorked = 0;

        assignments.forEach(a => {
            if (!a.taskId) return;
            const hours = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
            taskHours.set(a.taskId, (taskHours.get(a.taskId) || 0) + hours);
            totalHoursWorked += hours;
        });

        const tasksCompleted: string[] = [];
        const tasksInProgress: string[] = [];

        tasks.forEach(task => {
            const workedHours = taskHours.get(task.taskId) || 0;
            if (workedHours === 0) return; // Task not touched in this shift

            // Get starting hours for this task in this shift
            const startingHours = remainingAtStart
                ? remainingAtStart.get(task.taskId) || 0
                : task.estimatedRemainingLaborHours || task.estimatedTotalLaborHours || 0;

            const remainingAfter = Math.max(0, startingHours - workedHours);

            if (remainingAfter <= 0.001) {
                tasksCompleted.push(task.taskId);
            } else {
                tasksInProgress.push(task.taskId);
            }
        });

        return {
            shiftId,
            totalHoursWorked,
            tasksCompleted,
            tasksInProgress,
            productionRate
        };
    }

    /**
     * Check for mustCompleteWithinShift violations
     * A violation occurs when a task with this flag:
     * - Was not started (not_started)
     * - Was started but not finished (not_finished)
     * - Spans across shifts (spans_shifts)
     */
    private checkViolations(
        tasks: Task[],
        taskProgress: TaskShiftProgress[]
    ): ShiftCompletionViolation[] {
        const violations: ShiftCompletionViolation[] = [];

        tasks.forEach(task => {
            if (task.shiftCompletionPreference !== 'mustCompleteWithinShift') {
                return; // Only check tasks with this hard constraint
            }

            const progress = taskProgress.find(p => p.taskId === task.taskId);
            if (!progress) return;

            const taskName = task.name || task.taskId;

            if (progress.shift1Hours === 0 && progress.shift2Hours === 0) {
                // Task was never started
                violations.push({
                    taskId: task.taskId,
                    taskName: task.name,
                    type: 'not_started',
                    message: `Task ${taskName} has mustCompleteWithinShift but was never started`
                });
            } else if (progress.completedInShift === 'spans_shifts') {
                // Task spans across shifts
                violations.push({
                    taskId: task.taskId,
                    taskName: task.name,
                    type: 'spans_shifts',
                    message: `Task ${taskName} has mustCompleteWithinShift but spans across shifts`
                });
            } else if (progress.completedInShift === 'incomplete') {
                // Task started but not finished
                violations.push({
                    taskId: task.taskId,
                    taskName: task.name,
                    type: 'not_finished',
                    message: `Task ${taskName} has mustCompleteWithinShift but was not completed (${progress.completionPercentage.toFixed(1)}% done)`
                });
            }
            // If completedInShift is 'shift1' or 'shift2', no violation - task completed within a single shift
        });

        return violations;
    }
}
