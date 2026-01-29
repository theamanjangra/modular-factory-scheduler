
import { Worker, Task, WorkerTask } from '../types';
import { loadWorkerPreferences, WorkerPreferences } from '../utils/preferenceLoader';
import { ResourceManager } from './resourceManager';

interface AssignmentResult {
    results: WorkerTask[]; // New assignments created
    taskProgress: Map<string, number>; // TaskId -> LaborHours done in this step
    budgetUsedMs?: number;
}

interface BalanceOptions {
    reassignmentPenalty?: number;
    minAssignmentMinutes?: number;
    alignStartBonus?: number;
    interruptionConstraints?: Map<string, number>; // KAN-468: taskId -> maxWorkers during interruption
}

export class BalancingService {
    private workerPreferences: WorkerPreferences;

    constructor(preferenceFilePath: string = './Worker-Task algo data - Workers.csv') {
        try {
            this.workerPreferences = loadWorkerPreferences(preferenceFilePath);
            console.log(`[BalancingService] Loaded preferences for ${Object.keys(this.workerPreferences).length} workers.`);
        } catch (error) {
            console.error("[BalancingService] Failed to load worker preferences:", error);
            this.workerPreferences = {};
        }
    }

    /**
     * Zero-State Assignment Logic.
     * Queries ResourceManager for "Truth".
     */
    public balance(
        currentTime: number,
        stepDurationMs: number,
        allWorkers: Worker[], // PASS ALL WORKERS
        readyTasks: Array<{ task: Task; remainingHours: number; dependentCount?: number }>,
        resourceManager: ResourceManager,
        endTimeLimit: number,
        remainingBudgetMs?: number,
        options?: BalanceOptions
    ): AssignmentResult {

        const results: WorkerTask[] = [];
        const taskProgress = new Map<string, number>(); // Deprecated in logic, keeping for interface compatibility
        const stepEnd = Math.min(currentTime + stepDurationMs, endTimeLimit);
        let budgetUsedMs = 0;

        const assignableTasks = readyTasks.filter(item => {
            const task = item.task;
            return task.taskType !== 'nonWorker'
                && !(task.minWorkers === 0 && task.maxWorkers === 0);
        });

        // CONSTANTS
        const minAssignmentMinutes = options?.minAssignmentMinutes ?? 30;
        const minAssignmentDurationMs = minAssignmentMinutes * 60 * 1000;
        const alignStartBonus = options?.alignStartBonus ?? 150;
        const budgetChunkMs = stepDurationMs;

        // Sort Tasks (Priority: mustComplete > Blockers > prefersComplete > Critical Path > Deps > Remaining Work)
        assignableTasks.sort((a, b) => {
            // 1. HIGHEST PRIORITY: mustCompleteWithinShift tasks
            // These MUST start and finish in this shift - give them top priority
            const aMust = a.task.shiftCompletionPreference === 'mustCompleteWithinShift';
            const bMust = b.task.shiftCompletionPreference === 'mustCompleteWithinShift';
            if (aMust && !bMust) return -1;
            if (bMust && !aMust) return 1;

            // 2. Blockers (tasks that unblock others)
            const isBlockerA = (a.dependentCount || 0) > 0;
            const isBlockerB = (b.dependentCount || 0) > 0;
            if (isBlockerA && !isBlockerB) return -1;
            if (!isBlockerA && isBlockerB) return 1;

            // 3. prefersCompleteWithinShift - soft preference, prioritize early
            const aPref = a.task.shiftCompletionPreference === 'prefersCompleteWithinShift';
            const bPref = b.task.shiftCompletionPreference === 'prefersCompleteWithinShift';
            if (aPref && !bPref) return -1;
            if (bPref && !aPref) return 1;

            // 4. [NEW] In-Progress Priority (Finish what you started)
            // Ensure tasks that partially completed don't get dropped for new tasks during shift handover
            const totalA = a.task.estimatedTotalLaborHours || a.remainingHours; // Fallback to avoid division by zero
            const totalB = b.task.estimatedTotalLaborHours || b.remainingHours;

            // "In-Flight" defined as: Started (remaining < total) but not finished (remaining > 0)
            // Using a tolerance (0.1) to handle floating point noise
            const aInFlight = a.remainingHours < totalA - 0.1 && a.remainingHours > 0;
            const bInFlight = b.remainingHours < totalB - 0.1 && b.remainingHours > 0;

            if (aInFlight && !bInFlight) return -1; // A is in-flight, B is prioritized lower
            if (!aInFlight && bInFlight) return 1;

            // 5. Critical Path Score
            const scoreA = (a as any).criticalPathScore || 0;
            const scoreB = (b as any).criticalPathScore || 0;
            if (scoreA !== scoreB) return scoreB - scoreA;

            // 6. Dependent Count
            const depsA = a.dependentCount || 0;
            const depsB = b.dependentCount || 0;
            if (depsA !== depsB) return depsB - depsA;

            // 7. Remaining Hours (longer tasks first as tie-breaker)
            return b.remainingHours - a.remainingHours;
        });

        for (const item of assignableTasks) {
            if (remainingBudgetMs !== undefined && remainingBudgetMs < budgetChunkMs) {
                break;
            }
            const { task } = item;
            const min = task.minWorkers || 1;
            const max = task.maxWorkers || 100;
            const remaining = item.remainingHours;

            // FIX: Skip tasks that are already complete or have no remaining work
            if (remaining <= 0.0001) continue;

            // 1. Crew Size Cap (Anti-Swarm)
            // Logic: Default cap = ceil(TotalHours / 4).
            // Example: 4h task -> 1 worker.
            // MOD: If task blocks others (dependentCount > 0), be more aggressive (Divisor 2).
            // 1. Crew Size Cap (Anti-Swarm) - DISABLED COMPLETELY
            // Logic: User requested removal of divisor rule.
            // Allow swarming up to task.maxWorkers (or default 100).
            const optimalCrew = max;

            // CRUNCH TIME: If late in the day, boost crew to finish by deadline
            const hoursUntilEnd = Math.max(0.5, (endTimeLimit - currentTime) / (1000 * 60 * 60));
            const crunchCrew = Math.ceil(remaining / hoursUntilEnd);

            const targetCrew = Math.max(optimalCrew, crunchCrew);

            // Effective Max: Respect defined Max (usually 100) and calculated target.
            // No arbitrary "safety cap" of 4.
            let effectiveMax = Math.min(max, Math.max(min, targetCrew));

            // KAN-468: Apply interruption constraint if task is partially blocked
            const interruptMax = options?.interruptionConstraints?.get(task.taskId);
            if (interruptMax !== undefined) {
                effectiveMax = Math.min(effectiveMax, interruptMax);
            }

            // Final Safety: Always respect Min (unless interrupted)
            if (interruptMax === undefined) {
                effectiveMax = Math.max(effectiveMax, min);
            }

            const currentAssignedCount = resourceManager.getAssignedWorkerCount(task.taskId, currentTime, stepEnd);
            if (currentAssignedCount >= effectiveMax) continue;

            // FIX: User disabled "efficiency" checks.
            // Allow swarming even if it means finishing in 5 minutes.
            // const stepHours = stepDurationMs / (1000 * 60 * 60);
            // const workersNeededToFinish = Math.ceil(remaining / stepHours);

            const loopMax = effectiveMax;

            // 2. Filter Eligible Candidates
            const candidates = allWorkers.filter(w => {
                // A. Internal Busy Check
                // FIX: Use Continuous Assignment (Sub-step scheduling)
                // Instead of rejecting if booked, find NEXT availability within this step.
                const nextAvail = resourceManager.getNextAvailability(w.workerId, currentTime, stepEnd, task.taskId);
                if (nextAvail === null) return false; // Fully booked

                // Store the calculated start time for this worker (might be mid-step)
                (w as any)._tempStartTime = nextAvail;

                // B. Skill Check - REMOVED

                // C. Shift Availability Check (handled by caller somewhat, but good to check end time)
                // If worker shift ends in 10 mins, maybe don't assign? 
                // Let's rely on simple presence for now.

                // D. Shift Completion Constraint - REMOVED
                // The old logic incorrectly filtered workers instead of prioritizing tasks.
                // mustCompleteWithinShift is now handled via task priority sorting.
                // Tasks with this flag get HIGHEST priority to maximize completion chance.
                // Violations are reported in the response if task doesn't complete.

                return true;
            });

            // 3. Score Candidates (Stickiness)
            const candidatePool = candidates.map(w => ({ worker: w }));

            // 4. MinWorkers Constraint (with relaxation for in-progress tasks)
            // Check if task has already received work (from RM, not remaining hours)
            const existingAssignments = resourceManager.getAssignmentsByTime(0, currentTime + stepDurationMs)
                .filter(a => a.taskId === task.taskId);
            const isInProgress = existingAssignments.length > 0;

            // If task is in progress, allow continued work with at least 1 worker
            // WRONG: User wants strict adherence.
            // const effectiveMin = isInProgress ? 1 : min;
            const effectiveMin = min;

            if ((candidatePool.length + currentAssignedCount) < effectiveMin) {
                continue;
            }

            // FIX: Track remaining work in MS for this task within this step
            let remainingWorkMsForTask = remaining * 60 * 60 * 1000; // Convert hours to MS

            // 5. Sort & Assign
            // EQUITABLE DISTRIBUTION LOGIC:
            // Before assigning, determine how many workers we *intend* to use.
            // This allows us to split the remaining time equally instead of having the first worker take the bulk.
            const potentialCrewSize = Math.min(candidatePool.length, loopMax);

            let preciseDurationLimit = Number.POSITIVE_INFINITY;

            if (potentialCrewSize > 0) {
                // Check if the total capacity of this crew within this step is enough to finish the task
                const totalCapacityInStep = potentialCrewSize * stepDurationMs;

                if (remainingWorkMsForTask <= totalCapacityInStep) {
                    // We can finish the task in this step!
                    // Split the work equally.
                    // Example: 0.6h remaining, 3 workers. Duration = 0.2h (12 mins) each.
                    // Add a small buffer (1s) to avoid floating point rounding issues causing incomplete tasks
                    preciseDurationLimit = Math.ceil(remainingWorkMsForTask / potentialCrewSize) + 1000;
                }
            }

            let assignedCount = 0;
            while (candidatePool.length > 0) {
                if (assignedCount >= loopMax) break;
                if (remainingWorkMsForTask <= 0) break; // STOP: Task is now "complete" for this scheduling pass
                if (remainingBudgetMs !== undefined && remainingBudgetMs < budgetChunkMs) break;

                const scoredCandidates = candidatePool.map(box => {
                    const workerStartTime = (box.worker as any)._tempStartTime || currentTime;
                    let score = this.calculateFinalScore(box.worker, task, resourceManager, currentTime, options);
                    if (resourceManager.hasAssignmentStartingAt(task.taskId, workerStartTime)) {
                        score += alignStartBonus;
                    }
                    return { ...box, score, workerStartTime };
                });

                scoredCandidates.sort((a, b) => b.score - a.score);
                const box = scoredCandidates[0];
                if (!box) break;

                const w = box.worker;

                const workerStartTime = box.workerStartTime || currentTime;

                const index = candidatePool.findIndex(item => item.worker.workerId === w.workerId);
                if (index >= 0) {
                    candidatePool.splice(index, 1);
                } else {
                    candidatePool.shift();
                }

                const workerPreviousTask = resourceManager.getPreviousTask(w.workerId, workerStartTime);
                const isSameTask = workerPreviousTask === task.taskId;

                // Check worker availability end time
                let workerAvailabilityEnd = endTimeLimit;
                if (w.availability) {
                    const intervals = Array.isArray(w.availability) ? w.availability : [w.availability];
                    // Find the interval relevant to current time
                    const activeInterval = intervals.find(iv => {
                        const start = new Date(iv.startTime).getTime();
                        const end = new Date(iv.endTime).getTime();
                        return workerStartTime >= start && workerStartTime < end;
                    });
                    if (activeInterval) {
                        workerAvailabilityEnd = new Date(activeInterval.endTime).getTime();
                    }
                }

                const baseStepEnd = currentTime + stepDurationMs;
                const minAssignmentEnd = !isSameTask
                    ? workerStartTime + minAssignmentDurationMs
                    : baseStepEnd;
                const targetEndDate = Math.max(baseStepEnd, minAssignmentEnd);

                // FIX: Duration Logic
                // 1. Calculate max possible duration based on constraints
                let availableDuration = Math.min(
                    targetEndDate - workerStartTime,           // Time left in step
                    workerAvailabilityEnd - workerStartTime,   // Worker shift end
                    endTimeLimit - workerStartTime             // Global end
                );

                if (remainingBudgetMs !== undefined) {
                    availableDuration = Math.min(availableDuration, remainingBudgetMs);
                }

                // Effective Duration for THIS worker
                const workNeededDuration = remainingWorkMsForTask;

                const actualDuration = Math.min(availableDuration, workNeededDuration);

                // Zero Duration Guard - Enforce minimum 1 minute unless finishing?
                // Actually, if actualDuration < 1s, just skip
                if (actualDuration < 1000) continue;

                const actualEndDate = workerStartTime + actualDuration;

                // If actual duration is too small (e.g. < 10 mins), skip to avoid micro-assignments
                // MOD: For continuous flow, we ALLOW them if they are meaningful > 1 min
                const assignmentDurationMs = actualEndDate - workerStartTime;

                // --- MIN ASSIGNMENT DURATION FOR TASK SWITCHES ---
                // Check if this worker was on a DIFFERENT task before
                if (!isSameTask && assignmentDurationMs < minAssignmentDurationMs) {
                    continue;
                }

                // Allow > 1 min (legacy check, mostly superseded by above)
                if (assignmentDurationMs < 60000 && remainingWorkMsForTask > 60000) {
                    // Only skip if valid work exists but we are assigning < 1 min
                    continue;
                }

                const assignment: WorkerTask = {
                    workerId: w.workerId,
                    taskId: task.taskId,
                    startDate: new Date(workerStartTime).toISOString(),
                    endDate: new Date(actualEndDate).toISOString()
                };

                resourceManager.addAssignment(assignment);
                results.push(assignment);
                assignedCount++;

                // FIX: Decrement remaining work for this task
                remainingWorkMsForTask -= assignmentDurationMs;
                if (remainingBudgetMs !== undefined) {
                    remainingBudgetMs -= budgetChunkMs;
                    budgetUsedMs += budgetChunkMs;
                }
            }
        } // End of candidates loop

        return { results, taskProgress, budgetUsedMs };
    }

    private getBaseScore(worker: Worker, taskName: string): number {
        const pref = this.getWorkerPreference(worker, taskName);
        switch (pref) {
            case 1: return 100;
            case 2: return 50;
            case 3: return 10;
            case 4: return 0;
            default: return 10;
        }
    }

    private calculateFinalScore(
        worker: Worker,
        task: Task,
        rm: ResourceManager,
        currentTime: number,
        options?: BalanceOptions
    ): number {
        let score = this.getBaseScore(worker, task.name || "");

        // Continuity Bonus (Higher = Stickier)
        // Check RM for previous slot
        const prevTask = rm.getPreviousTask(worker.workerId, currentTime);

        // Define Penalty Base from options or default
        const penaltyBase = options?.reassignmentPenalty ?? 500;

        // Stickiness Logic:
        // If same task: Big Bonus (2x Penalty or hardcoded high value?) 
        // Let's use 2x Penalty to scale with the penalty preference.
        // Default was +1000.

        if (prevTask === task.taskId) {
            score += (penaltyBase * 2);
        } else if (prevTask) {
            // Task Switching Penalty
            // If they were working on something else just now, penalize switching
            score -= penaltyBase;
        }

        return score;
    }

    private getWorkerPreference(worker: Worker, taskName: string): number {
        if (worker.preferences && worker.preferences[taskName] !== undefined) {
            return worker.preferences[taskName];
        }
        const workerPrefs = this.workerPreferences[worker.name || ""];
        if (!workerPrefs) return 3;
        return workerPrefs[taskName] !== undefined ? workerPrefs[taskName] : 3;
    }
}
