import { Worker, Task, WorkerTask, PlanRequest } from '../types';
import { parseDate } from '../utils/timeUtils';
import { computeEstimatedTotalLaborHours } from '../utils/estimation';
import { resolveSchedulingConfig } from '../utils/schedulingConfig';
import { BalancingService } from './balancingService';
import { ResourceManager } from './resourceManager';
import { taskInterruptionService } from './taskInterruptionService';

interface SimulationState {
    tasks: Map<string, {
        task: Task;
        remainingHours: number;
        isComplete: boolean;
        assignedWorkers: Set<string>;
        criticalPathScore: number; // Higher = More Critical
        waitStartTime?: number; // For Wait Tasks: when did the wait begin?
    }>;
    // Workers state removed (Source of Truth is ResourceManager)
}

export class PlanningService {
    private readonly COMPLETION_EPSILON_HOURS = 0.0001; // Avoid floating-point leftovers
    private balancingService: BalancingService;

    constructor() {
        this.balancingService = new BalancingService('./Worker-Task algo data - Workers.csv');
    }

    public plan(request: PlanRequest & { planId?: string }, options?: {
        reassignmentPenalty?: number;
        seedAssignments?: WorkerTask[];
    }): any[] {
        console.log('--- START PLANNING ---');
        const { workers, tasks, interval, useHistorical, workBudgetHours, planId } = request as any;
        const scheduling = resolveSchedulingConfig(request.scheduling);
        console.log(`Inputs: ${workers.length} workers, ${tasks.length} tasks${planId ? `, planId: ${planId}` : ''}`);

        if (options?.reassignmentPenalty) {
            console.log(`Preference: Reassignment Penalty = ${options.reassignmentPenalty}`);
        }

        const startTimeVals = parseDate(interval.startTime).getTime();
        const endTimeVals = parseDate(interval.endTime).getTime();

        // 1. Initialize Estimates
        tasks.forEach((t: Task) => {
            const nonWorkerDuration = this.getNonWorkerDurationHours(t);
            if (nonWorkerDuration !== undefined) {
                t.estimatedTotalLaborHours = nonWorkerDuration;
            }
            if (t.estimatedTotalLaborHours === undefined) {
                const computed = computeEstimatedTotalLaborHours(t);
                if (typeof computed === 'number') {
                    t.estimatedTotalLaborHours = computed;
                } else {
                    const base = t.minWorkers ? t.minWorkers * 4 : 4;
                    t.estimatedTotalLaborHours = useHistorical ? base * 0.9 : base;
                }
            }
            if (t.estimatedRemainingLaborHours === undefined) {
                t.estimatedRemainingLaborHours = t.estimatedTotalLaborHours;
            }
        });

        // 2a. Calculate Critical Path Scores (Topological Analysis)
        const criticalPathScores = this.calculateCriticalPathScores(tasks);

        // 2. Setup Simulation State
        const state: SimulationState = {
            tasks: new Map(tasks.map((t: Task) => [t.taskId, {
                task: t,
                remainingHours: t.estimatedRemainingLaborHours!,
                isComplete: t.estimatedRemainingLaborHours! <= 0,
                assignedWorkers: new Set(),
                criticalPathScore: criticalPathScores.get(t.taskId) || 0
            }]))
        };

        const resourceManager = new ResourceManager(scheduling.transitionGapMs); // New Source of Truth

        // --- SEED ASSIGNMENTS FOR STABILITY ---
        if (options?.seedAssignments) {
            console.log(`Seeding ${options.seedAssignments.length} previous assignments`);
            options.seedAssignments.forEach(a => resourceManager.addAssignment(a));
        }

        const rawSteps: any[] = [];
        const stepMs = scheduling.timeStepMinutes * 60 * 1000;
        let currentTime = startTimeVals;
        const lastAssignedTask = new Map<string, string>();
        let remainingBudgetMs = typeof workBudgetHours === 'number'
            ? Math.max(0, Math.floor((workBudgetHours * 60 * 60 * 1000) / stepMs) * stepMs)
            : undefined;

        // 2b. Pre-calculate Reverse Dependencies (How many tasks depend on me?)
        const dependentCounts = new Map<string, number>();
        tasks.forEach((t: Task) => {
            if (t.prerequisiteTaskIds) {
                t.prerequisiteTaskIds.forEach((prereqId: string) => {
                    const current = dependentCounts.get(prereqId) || 0;
                    dependentCounts.set(prereqId, current + 1);
                });
            }
        });

        // 3. Phase-Based Execution
        // Define Phases dynamically or statically? For V2, static split is fine.
        // Phase 1: Morning Push (First 4 hours)
        // Phase 2: Afternoon Continuation (Rest of day)

        const phases = [
            {
                name: "Phase 1: Morning Push - Critical Path Focus",
                startTime: startTimeVals,
                endTime: startTimeVals + (4 * 60 * 60 * 1000), // 4 Hours
                strategy: "CRITICAL_PATH_FOCUS"
            },
            {
                name: "Phase 2: Afternoon Continuation - Balanced Flow",
                startTime: startTimeVals + (4 * 60 * 60 * 1000),
                endTime: endTimeVals,
                strategy: "BALANCED"
            }
        ];

        for (const phase of phases) {
            console.log(`--- Starting ${phase.name} ---`);

            // Skip phases entirely in past
            if (phase.endTime <= startTimeVals) continue;

            // Adjust start time if mid-phase
            const phaseStart = Math.max(phase.startTime, startTimeVals);

            // Inject Narrative Comment
            rawSteps.push({
                comment: `--- ${phase.name} ---`,
                startDate: new Date(phaseStart).toISOString(),
                endDate: new Date(phaseStart).toISOString(), // Dummy end for type safety
                type: 'comment'
            });

            let currentTime = phaseStart;
            while (currentTime < phase.endTime) {
                if (this.allTasksComplete(state)) {
                    break;
                }
                if (currentTime >= endTimeVals) {
                    break;
                }

                const stepStart = new Date(currentTime).toISOString();
                const stepEndTs = currentTime + stepMs;
                const stepEnd = new Date(stepEndTs).toISOString();

                // A. Identify Ready Tasks
                const readyTasks = this.getReadyTasks(state, currentTime, planId);

                // A-1. Handle Wait Tasks (Non-Labor)
                // Filter ready tasks to find those that are NON-WORKER (Wait Tasks)
                // LOOP: We iterate because completing one wait task might unblock another wait task immediately.
                let waitCheckPass = 0;
                const recordedWaitTasks = new Set<string>(); // Prevent duplicate assignment records per step

                while (waitCheckPass < 10) { // Safety cap
                    const currentReadyTasks = this.getReadyTasks(state, currentTime, planId);
                    const waitTasks = currentReadyTasks.filter(item =>
                        this.isNonWorkerTask(item.task) && !state.tasks.get(item.task.taskId)?.isComplete
                    );

                    if (waitTasks.length === 0) break; // No work to do

                    let progressMade = false;

                    waitTasks.forEach(item => {
                        const tState = state.tasks.get(item.task.taskId);
                        if (!tState) return;

                        // Start the wait if not started
                        if (tState.waitStartTime === undefined) {
                            tState.waitStartTime = currentTime;
                        }

                        // Check completion
                        const durationMs = this.getTaskDurationHours(tState.task) * 60 * 60 * 1000;
                        const elapsed = currentTime - tState.waitStartTime;

                        if (elapsed >= durationMs) {
                            tState.isComplete = true;
                            tState.remainingHours = 0;
                            // Mark progress to trigger another pass
                            progressMade = true;
                        } else {
                            // Decrease remaining hours for display/tracking
                            const remainingMs = Math.max(0, durationMs - elapsed);
                            tState.remainingHours = remainingMs / (1000 * 60 * 60);

                            // Record wait activity
                            if (!tState.isComplete) {
                                if (!recordedWaitTasks.has(item.task.taskId)) {
                                    rawSteps.push({
                                        startDate: new Date(currentTime).toISOString(),
                                        endDate: new Date(currentTime + stepMs).toISOString(),
                                        type: 'assignment',
                                        workerId: null, // No worker
                                        taskId: item.task.taskId,
                                        taskName: item.task.name,
                                        isWaitTask: true
                                    });
                                    recordedWaitTasks.add(item.task.taskId);
                                }
                            }
                        }
                    });

                    if (!progressMade) break; // Nothing completed, so no new tasks will become ready
                    waitCheckPass++;
                }

                // FIX: Re-check for newly ready tasks after wait task completion
                // This ensures tasks dependent on wait tasks (e.g., "2nd Coat" after "Dry Time")
                // can start immediately in the same time step when their prerequisite completes.
                const updatedReadyTasks = this.getReadyTasks(state, currentTime, planId);
                const laborTasks = updatedReadyTasks.filter(item => !this.isNonWorkerTask(item.task));

                // KAN-468: Build interruption constraints for partially blocked tasks
                const interruptionConstraints = new Map<string, number>();
                if (planId) {
                    laborTasks.forEach(item => {
                        const maxWorkers = taskInterruptionService.getMaxWorkersDuringInterruption(planId, item.task.taskId);
                        if (maxWorkers !== undefined && maxWorkers > 0) {
                            interruptionConstraints.set(item.task.taskId, maxWorkers);
                        }
                    });
                    if (interruptionConstraints.size > 0) {
                        console.log(`[Interruption] Applying worker limits: ${JSON.stringify(Object.fromEntries(interruptionConstraints))}`);
                    }
                }

                // B. Filter Workers (Global Availability)
                const shiftAvailableWorkers = workers.filter((w: Worker) => {
                    if (!w.availability) return true;

                    let intervals = Array.isArray(w.availability) ? w.availability : [w.availability];

                    // Check if currentTime is within ANY valid interval
                    const isAvailable = intervals.some((iv: { startTime: string; endTime: string }) => {
                        const start = parseDate(iv.startTime).getTime();
                        const end = parseDate(iv.endTime).getTime();
                        // If times are invalid, assume available? No, safe to assume unavailable if explicit window broken.
                        if (isNaN(start) || isNaN(end)) return false;
                        return currentTime >= start && currentTime < end;
                    });

                    return isAvailable;
                });

                // C. Prioritize Tasks based on Phase Strategy
                // Strategy: CRITICAL_PATH_FOCUS -> Sort by CriticalPathScore DESC
                // FIX: Deduct "committed future work" from remainingHours
                const prioritizedTasks = laborTasks.map(item => {
                    // Calculate work already scheduled for this task that extends past currentTime
                    // This represents workers who are ALREADY assigned and will contribute work
                    const allAssignments = resourceManager.getAllAssignments().filter(a => a.taskId === item.task.taskId);
                    let committedFutureWork = 0;
                    for (const a of allAssignments) {
                        const aStart = new Date(a.startDate).getTime();
                        const aEnd = new Date(a.endDate).getTime();

                        // Only count the portion of the assignment that is AFTER currentTime
                        if (aEnd > currentTime) {
                            const futureStart = Math.max(currentTime, aStart);
                            const futureDurationMs = aEnd - futureStart;
                            committedFutureWork += futureDurationMs / (1000 * 60 * 60);
                        }
                    }

                    // Effective remaining = state remaining - already committed work
                    const effectiveRemaining = Math.max(0, item.remainingHours - committedFutureWork);

                    return {
                        ...item,
                        remainingHours: effectiveRemaining, // OVERRIDE with adjusted value
                        dependentCount: dependentCounts.get(item.task.taskId) || 0,
                        criticalPathScore: state.tasks.get(item.task.taskId)?.criticalPathScore || 0
                    };
                });

                // Sort
                prioritizedTasks.sort((a, b) => {
                    // V2 Logic: Critical Path Score (High) > Completion Urgency > Dependent Count > Remaining

                    if (phase.strategy === "CRITICAL_PATH_FOCUS") {
                        // Weighted Sort: CP Score is dominant
                        if (b.criticalPathScore !== a.criticalPathScore) {
                            return b.criticalPathScore - a.criticalPathScore;
                        }
                    }

                    // NEW: Completion Urgency - prioritize tasks close to finishing OR not yet started
                    // This ensures small/medium tasks don't get starved by large tasks
                    const totalA = a.task.estimatedTotalLaborHours || 1;
                    const totalB = b.task.estimatedTotalLaborHours || 1;
                    const progressA = 1 - (a.remainingHours / totalA); // 0 = not started, 1 = done
                    const progressB = 1 - (b.remainingHours / totalB);

                    // Boost: Tasks partially done (30-90%) should finish first
                    // Also boost: Tasks not started at all (0%) to ensure they get attention
                    const urgencyA = progressA > 0.3 ? progressA : (progressA === 0 ? 0.5 : progressA);
                    const urgencyB = progressB > 0.3 ? progressB : (progressB === 0 ? 0.5 : progressB);

                    if (Math.abs(urgencyA - urgencyB) > 0.1) {
                        return urgencyB - urgencyA; // Higher urgency first
                    }

                    // Fallback / Balanced Sort
                    if (b.dependentCount !== a.dependentCount) return b.dependentCount - a.dependentCount;
                    return b.remainingHours - a.remainingHours;
                });

                // D. Balance
                let assignment: { results: WorkerTask[]; taskProgress: Map<string, number>; budgetUsedMs?: number } = { results: [], taskProgress: new Map<string, number>(), budgetUsedMs: 0 };
                if (remainingBudgetMs !== undefined && remainingBudgetMs < stepMs) {
                    remainingBudgetMs = 0;
                }
                if (remainingBudgetMs === undefined || remainingBudgetMs > 0) {
                    assignment = this.balancingService.balance(
                        currentTime,
                        stepMs,
                        shiftAvailableWorkers,
                        prioritizedTasks,
                        resourceManager,
                        endTimeVals,
                        remainingBudgetMs,
                        {
                            reassignmentPenalty: options?.reassignmentPenalty,
                            minAssignmentMinutes: scheduling.minAssignmentMinutes,
                            interruptionConstraints  // KAN-468: Pass interruption limits
                        } // Pass Penalty + Scheduling
                    );
                }

                // E. Record Results
                assignment.results.forEach(res => {
                    const tState = state.tasks.get(res.taskId!);
                    rawSteps.push({
                        startDate: res.startDate, // Revert to internal key
                        endDate: res.endDate,     // Revert to internal key
                        type: 'assignment',
                        workerId: res.workerId,
                        taskId: res.taskId,
                        taskName: tState?.task.name,
                        // Optionally add comment to assignment if interesting?
                    });
                });
                if (remainingBudgetMs !== undefined) {
                    remainingBudgetMs = Math.max(0, remainingBudgetMs - (assignment.budgetUsedMs || 0));
                }

                // F. Update Progress (Using ACTUAL assignment durations, not step duration)
                const stepStartMs = currentTime;
                const stepEndMs = currentTime + stepMs;

                state.tasks.forEach((tState, taskId) => {
                    if (tState.isComplete) return;

                    // Get all assignments for this task that overlap with the current step
                    const taskAssignments = resourceManager.getAssignmentsByTime(stepStartMs, stepEndMs)
                        .filter(a => a.taskId === taskId);

                    if (taskAssignments.length > 0) {
                        // Calculate actual hours done by summing overlap durations
                        let hoursDone = 0;
                        for (const a of taskAssignments) {
                            const aStart = new Date(a.startDate).getTime();
                            const aEnd = new Date(a.endDate).getTime();

                            // Calculate overlap with current step
                            const overlapStart = Math.max(stepStartMs, aStart);
                            const overlapEnd = Math.min(stepEndMs, aEnd);
                            const overlapMs = Math.max(0, overlapEnd - overlapStart);

                            hoursDone += overlapMs / (1000 * 60 * 60);
                        }

                        tState.remainingHours -= hoursDone;

                        if (tState.remainingHours <= this.COMPLETION_EPSILON_HOURS) {
                            tState.isComplete = true;
                            tState.remainingHours = 0;
                        }
                    }
                });

                // G. Record Idle/Unassigned (Optional for V2 Story, but good for debug)
                // Skipping "worker_idle" spam to keep narrative clean? 
                // User asked for "Mixed list of Assignment objects and Comment objects".
                // Let's keep IDLE out unless requested? User didn't explicitly ban it, but "Minimalist Planner" implies clean.
                // Keeping it for now for chart visualization safety.

                shiftAvailableWorkers.forEach((w: Worker) => {
                    if (!resourceManager.isBooked(w.workerId, currentTime, currentTime + stepMs)) {
                        rawSteps.push({
                            startDate: stepStart,
                            endDate: stepEnd,
                            type: 'worker_idle',
                            workerId: w.workerId
                        });
                    }
                });

                currentTime += stepMs;
            }
        }

        console.log(`--- PLANNING COMPLETE: Generated ${rawSteps.length} steps ---`);
        return rawSteps;
    }

    private allTasksComplete(state: SimulationState): boolean {
        return Array.from(state.tasks.values()).every(t => t.isComplete);
    }

    private getReadyTasks(state: SimulationState, time: number, planId?: string) {
        const incomplete = Array.from(state.tasks.values()).filter(t => !t.isComplete);

        return incomplete.filter(item => {
            // KAN-468: Check if task is fully interrupted (maxWorkers = 0)
            if (planId) {
                const interruption = taskInterruptionService.isTaskInterrupted(planId, item.task.taskId);
                if (interruption) {
                    const maxWorkers = taskInterruptionService.getMaxWorkersDuringInterruption(planId, item.task.taskId);
                    if (maxWorkers === 0) {
                        // Fully blocked - skip this task entirely
                        return false;
                    }
                }
            }

            // Check Start Date
            if (item.task.earliestStartDate) {
                const start = parseDate(item.task.earliestStartDate).getTime();
                if (time < start) return false;
            }

            // Check Prerequisites
            if (item.task.prerequisiteTaskIds && item.task.prerequisiteTaskIds.length > 0) {
                const allPrereqsDone = item.task.prerequisiteTaskIds.every(pid => {
                    const pState = state.tasks.get(pid);
                    return pState && pState.isComplete;
                });
                if (!allPrereqsDone) return false;
            }
            return true;
        });
    }

    /**
     * Calculates the "Longest Path to Completion" for each task.
     * Score = TaskDuration + Max(ChildrenScores)
     */
    private calculateCriticalPathScores(tasks: Task[]): Map<string, number> {
        const scores = new Map<string, number>();
        const taskMap = new Map(tasks.map(t => [t.taskId, t]));

        // Build Adjacency List (Parent -> Children)
        const childrenMap = new Map<string, string[]>();
        tasks.forEach(t => {
            if (t.prerequisiteTaskIds) {
                t.prerequisiteTaskIds.forEach(parentId => {
                    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
                    childrenMap.get(parentId)!.push(t.taskId);
                });
            }
        });

        // Memoized Recursive Calc with cycle guard to avoid stack overflows
        const visiting = new Set<string>();
        const getScore = (taskId: string): number => {
            if (scores.has(taskId)) return scores.get(taskId)!;
            if (visiting.has(taskId)) {
                // Cycle detected; break the loop with a minimal score contribution
                return 0;
            }
            visiting.add(taskId);

            const task = taskMap.get(taskId);
            if (!task) {
                visiting.delete(taskId);
                return 0;
            }

            const duration = this.getTaskDurationHours(task);
            const children = childrenMap.get(taskId) || [];

            let maxChildScore = 0;
            if (children.length > 0) {
                maxChildScore = Math.max(...children.map(childId => getScore(childId)));
            }

            const totalScore = duration + maxChildScore;
            scores.set(taskId, totalScore);
            visiting.delete(taskId);
            return totalScore;
        };

        // Calculate for all
        tasks.forEach(t => getScore(t.taskId));

        return scores;
    }

    private isNonWorkerTask(task: Task): boolean {
        return task.taskType === 'nonWorker'
            || (task.minWorkers === 0 && task.maxWorkers === 0);
    }

    private getNonWorkerDurationHours(task: Task): number | undefined {
        if (!this.isNonWorkerTask(task)) return undefined;
        if (typeof task.nonWorkerTaskDuration !== 'number') return undefined;
        if (!Number.isFinite(task.nonWorkerTaskDuration)) return undefined;
        return task.nonWorkerTaskDuration;
    }

    private getTaskDurationHours(task: Task): number {
        const nonWorkerDuration = this.getNonWorkerDurationHours(task);
        if (nonWorkerDuration !== undefined) return nonWorkerDuration;
        return task.estimatedTotalLaborHours || 0;
    }
}
