
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
    enforceDepartmentMatch?: boolean; // When true, workers can only work on same-department tasks
    useCrewCap?: boolean; // When true, limits crew so each worker contributes at least 2× minAssignment
    preventLateJoiners?: boolean; // When true, don't assign new workers to a task past halfway with an active crew
    keepCrewTogether?: boolean; // When true, all crew members stay on a task until it's complete
    workerLocks?: Map<string, string>; // Persistent worker→task locks from planningService (survive seed gaps)
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
        readyTasks: Array<{ task: Task; remainingHours: number; rawRemainingHours?: number; dependentCount?: number }>,
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
        const budgetMinThresholdMs = 60 * 1000; // 1 minute – minimum meaningful work for budget check

        // Removed assignableTasks.sort() to strictly respect the incoming priority
        // order established by PlanningService, ensuring continuity bonuses work.

        // ── STICKY RESERVATION PRE-PASS ──
        // Workers who were previously on a task that still needs work are "reserved"
        // for that task. This prevents higher-priority tasks from stealing them,
        // eliminating the A → B → A fragmentation pattern.
        //
        // Priority 1: Persistent locks from planningService (survive seed gaps between passes)
        // Priority 2: Previous-task adjacency from ResourceManager (fallback for unlocked workers)
        const reservedWorkers = new Map<string, string>(); // workerId → reserved taskId
        for (const w of allWorkers) {
            // Check persistent lock first — survives across seed assignment gaps
            const lockedTaskId = options?.workerLocks?.get(w.workerId);
            if (lockedTaskId) {
                const lockedItem = assignableTasks.find(item => item.task.taskId === lockedTaskId);
                if (lockedItem && (lockedItem.rawRemainingHours ?? lockedItem.remainingHours) > 0.0001) {
                    reservedWorkers.set(w.workerId, lockedTaskId);
                    continue;
                }
            }
            // Fallback: adjacency-based reservation for workers without a persistent lock
            const prevTaskId = resourceManager.getPreviousTask(w.workerId, currentTime);
            if (!prevTaskId) continue;
            // Only reserve if the previous task is still assignable with actual remaining work
            const prevItem = assignableTasks.find(item => item.task.taskId === prevTaskId);
            if (prevItem && (prevItem.rawRemainingHours ?? prevItem.remainingHours) > 0.0001) {
                reservedWorkers.set(w.workerId, prevTaskId);
            }
        }

        // Count reserved workers per task (for keepCrewTogether effectiveMax bump)
        const reservedPerTask = new Map<string, number>();
        if (options?.keepCrewTogether) {
            for (const [, taskId] of reservedWorkers) {
                reservedPerTask.set(taskId, (reservedPerTask.get(taskId) || 0) + 1);
            }
        }

        for (const item of assignableTasks) {
            if (remainingBudgetMs !== undefined && remainingBudgetMs < budgetMinThresholdMs) {
                break;
            }
            const { task } = item;
            const min = task.minWorkers || 1;
            const max = task.maxWorkers || 100;
            const remaining = item.remainingHours;

            // FIX: Skip tasks that are already complete or have no remaining work
            if (remaining <= 0.0001) continue;

            // 1. Crew Size Cap (Anti-Swarm)
            // cap = ceil(totalHours / divisor). Divisor 2 if task blocks others, else 4.
            const useAntiSwarm = true; // Toggle: false = disabled (swarm up to maxWorkers)
            const bypassAntiSwarmForDependents = true; // Toggle: true = tasks WITH dependents skip anti-swarm, use maxWorkers
            const totalHours = task.estimatedTotalLaborHours || remaining;
            const divisor = 2;
            const hasDependents = item.dependentCount && item.dependentCount > 0;
            const optimalCrew = useAntiSwarm
                ? (bypassAntiSwarmForDependents && hasDependents ? max : Math.ceil(totalHours / divisor))
                : max;

            // CRUNCH TIME: If late in the day, boost crew to finish by deadline
            const hoursUntilEnd = Math.max(0.5, (endTimeLimit - currentTime) / (1000 * 60 * 60));
            const crunchCrew = Math.ceil(remaining / hoursUntilEnd);

            const targetCrew = Math.max(optimalCrew, crunchCrew);

            // Effective Max: Respect defined Max (usually 100) and calculated target.
            // No arbitrary "safety cap" of 4.
            let effectiveMax = Math.min(max, Math.max(min, targetCrew));

            // PRACTICAL CREW CAP: Each worker should contribute at least 2× minAssignment
            // (e.g., 1h for 30-min blocks). Prevents cluttered schedules with tiny stints.
            // Exception: last 2 hours of shift — crunch takes priority.
            if (options?.useCrewCap && remaining > 0) {
                const practicalMinPerWorkerHours = (minAssignmentMinutes * 2) / 60;
                const shiftRemainingHours = (endTimeLimit - currentTime) / (1000 * 60 * 60);
                if (shiftRemainingHours > practicalMinPerWorkerHours * 2) {
                    const practicalCrew = Math.max(min, Math.floor(remaining / practicalMinPerWorkerHours));
                    effectiveMax = Math.min(effectiveMax, practicalCrew);
                }
            }

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

            // keepCrewTogether: ensure effectiveMax accommodates all reserved crew members
            if (options?.keepCrewTogether) {
                const reservedCount = reservedPerTask.get(task.taskId) || 0;
                if (reservedCount > effectiveMax) {
                    effectiveMax = reservedCount;
                }
            }

            if (currentAssignedCount >= effectiveMax) continue;

            // FIX: User disabled "efficiency" checks.
            // Allow swarming even if it means finishing in 5 minutes.
            // const stepHours = stepDurationMs / (1000 * 60 * 60);
            // const workersNeededToFinish = Math.ceil(remaining / stepHours);

            const loopMax = effectiveMax;

            // 1b. Late Joiner Prevention: if remaining hours per current crew member < 2h,
            // the crew can finish it themselves — don't add new workers.
            let lateJoinerCrewIds: Set<string> | null = null;
            if (options?.preventLateJoiners) {
                const crewWorkerIds = new Set<string>();
                for (const a of resourceManager.getAllAssignments()) {
                    if (a.taskId === task.taskId && a.workerId) {
                        crewWorkerIds.add(a.workerId);
                    }
                }
                if (crewWorkerIds.size > 0 && (remaining / crewWorkerIds.size) < 1) {
                    lateJoinerCrewIds = crewWorkerIds;
                }
            }

            // 2. Filter Eligible Candidates
            const candidates = allWorkers.filter(w => {
                // A. Sticky Reservation: if worker is reserved for a DIFFERENT task, skip
                const reservedFor = reservedWorkers.get(w.workerId);
                if (reservedFor && reservedFor !== task.taskId) return false;

                // B. Internal Busy Check
                const nextAvail = resourceManager.getNextAvailability(w.workerId, currentTime, stepEnd, task.taskId);
                if (nextAvail === null) return false; // Fully booked

                // Store the calculated start time for this worker (might be mid-step)
                (w as any)._tempStartTime = nextAvail;

                // C. Department Hard Constraint
                if (options?.enforceDepartmentMatch && task.departmentId && w.departmentId) {
                    if (task.departmentId !== w.departmentId) return false;
                }

                // C2. Preference Hard Constraint: worker must have an explicit positive preference for the task.
                // canNotHelp (4) or no preference entry → blocked.
                if (task.name) {
                    const pref = w.preferences?.[task.name];
                    if (pref === undefined || pref === 4) {
                        return false;
                    }
                }

                // D. Skill Hard Constraint (cross-department only):
                // Same-dept workers are governed by preferences, not skills.
                // Cross-dept workers must have ALL required skills to be eligible.
                const crossDept = task.departmentId && w.departmentId && task.departmentId !== w.departmentId;
                if (crossDept) {
                    const reqSkills = task.requiredSkills;
                    if (reqSkills && reqSkills.length > 0) {
                        if (!w.skills || w.skills.length === 0) return false;
                        const hasAllSkills = reqSkills.every(skill => w.skills!.includes(skill));
                        if (!hasAllSkills) return false;
                    }
                }

                // E. Late Joiner Prevention: task past halfway with active crew → only existing crew
                if (lateJoinerCrewIds && !lateJoinerCrewIds.has(w.workerId)) return false;

                return true;
            });

            // 3. Crew Priority: existing crew fills slots first, newcomers get leftovers
            const availableSlots = effectiveMax - currentAssignedCount;
            const reservedCandidates = candidates.filter(w => reservedWorkers.get(w.workerId) === task.taskId);
            const newcomerCandidates = candidates.filter(w => reservedWorkers.get(w.workerId) !== task.taskId);
            // Sort newcomers by score before slicing so best-matched workers get priority
            newcomerCandidates.sort((a, b) => {
                const scoreA = this.calculateFinalScore(a, task, resourceManager, currentTime, options);
                const scoreB = this.calculateFinalScore(b, task, resourceManager, currentTime, options);
                return scoreB - scoreA;
            });
            const newcomerSlots = Math.max(0, availableSlots - reservedCandidates.length);
            const finalCandidates = [
                ...reservedCandidates,
                ...newcomerCandidates.slice(0, newcomerSlots)
            ];

            const candidatePool = finalCandidates.map(w => ({ worker: w }));

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
                if (remainingBudgetMs !== undefined && remainingBudgetMs < budgetMinThresholdMs) break;

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

                // All assignments (switching or continuing) are locked to minAssignment blocks
                // e.g. 30 min → assignments are always 30, 60, 90 min etc.
                const minAssignmentEnd = workerStartTime + minAssignmentDurationMs;
                const baseStepEnd = currentTime + stepDurationMs;
                const targetEndDate = Math.max(baseStepEnd, minAssignmentEnd);

                // Calculate max possible duration based on constraints
                let availableDuration = Math.min(
                    targetEndDate - workerStartTime,           // Minimum assignment block
                    workerAvailabilityEnd - workerStartTime,   // Worker shift end
                    endTimeLimit - workerStartTime             // Global end
                );

                // Note: remainingBudgetMs does NOT cap availableDuration here.
                // Budget tracks actual labor consumed (precise), not display block size.
                // The budget check is done via remainingWorkMsForTask and the loop break above.

                // Actual work this worker will consume (precise, for budget/task tracking)
                let workConsumedMs = Math.min(availableDuration, remainingWorkMsForTask);

                // keepCrewTogether: split remaining work equally so all crew members finish together
                // Uses preciseDurationLimit (computed above) to cap each worker's share
                if (options?.keepCrewTogether && preciseDurationLimit < Number.POSITIVE_INFINITY) {
                    workConsumedMs = Math.min(workConsumedMs, preciseDurationLimit);
                }

                // Zero Duration Guard
                if (workConsumedMs < 1000) continue;

                // Round up to nearest minAssignment boundary for display duration
                // e.g. 10 min of actual work → 30 min block on the schedule
                const maxAllowedDuration = Math.min(
                    workerAvailabilityEnd - workerStartTime,
                    endTimeLimit - workerStartTime
                );
                const roundedDuration = Math.ceil(workConsumedMs / minAssignmentDurationMs) * minAssignmentDurationMs;
                const displayDuration = Math.min(roundedDuration, maxAllowedDuration);

                if (displayDuration < 1000) continue;

                const actualEndDate = workerStartTime + displayDuration;
                const assignmentDurationMs = displayDuration;

                // Skip if not enough room for a meaningful assignment
                if (assignmentDurationMs < minAssignmentDurationMs && maxAllowedDuration >= minAssignmentDurationMs) {
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

                // Deduct actual work consumed (precise), NOT the padded display duration.
                // This keeps budget/labor tracking accurate while the schedule shows clean 30-min blocks.
                remainingWorkMsForTask -= workConsumedMs;
                if (remainingBudgetMs !== undefined) {
                    remainingBudgetMs -= workConsumedMs;
                    budgetUsedMs += workConsumedMs;
                }
            }

            // Release reservations when task is fully served.
            // Handles the case where a task had a small "ghost remaining" due to
            // progress-tracking divergence — only 1 worker was needed to cover it,
            // but ALL previous workers were reserved. Release the un-needed ones
            // so they can be assigned to other tasks in this same balance() call.
            if (remainingWorkMsForTask <= 0) {
                for (const [workerId, reservedTaskId] of reservedWorkers) {
                    if (reservedTaskId === task.taskId) {
                        reservedWorkers.delete(workerId);
                    }
                }
            }
        } // End of candidates loop

        return { results, taskProgress, budgetUsedMs };
    }

    private getBaseScore(worker: Worker, taskName: string): number {
        const pref = this.getWorkerPreference(worker, taskName);
        switch (pref) {
            case 1: return 500;    // primaryJob
            case 2: return 200;    // secondaryJob
            case 3: return 100;    // canHelp
            case 4: return -1000;  // canNotHelp — hard-blocked in candidate filter, score is fallback
            default: return 10;    // no preference data — neutral
        }
    }

    private calculateFinalScore(
        worker: Worker,
        task: Task,
        rm: ResourceManager,
        currentTime: number,
        options?: BalanceOptions
    ): number {
        const sameDept = worker.departmentId && task.departmentId && worker.departmentId === task.departmentId;

        let score: number;

        if (sameDept) {
            // Same department: use preferences (+1000 dept bonus)
            // Workers only have preferences for their own department's tasks
            score = this.getBaseScore(worker, task.name || "") + 1000;
        } else {
            // Cross department: use skill matching instead of preferences
            const requiredSkills: string[] = (task as any).requiredSkills || [];
            const workerSkills: string[] = Array.isArray((worker as any).skills) ? (worker as any).skills : [];

            if (requiredSkills.length === 0) {
                score = 100; // No skill requirements — canHelp
            } else if (requiredSkills.every((s: string) => workerSkills.includes(s))) {
                score = 100; // Has ALL required skills — canHelp
            } else {
                score = -1000; // Missing skills — block
            }
        }

        // Continuity Bonus
        const prevTask = rm.getPreviousTask(worker.workerId, currentTime);
        const penaltyBase = options?.reassignmentPenalty ?? 0;

        if (prevTask === task.taskId) {
            score += (penaltyBase * 2);
        } else if (prevTask) {
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
