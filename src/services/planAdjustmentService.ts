import {
    Task,
    Worker,
    WorkerTask,
    AdjustPlanPreferences,
    CurrentAssignment,
    AdjustPlanDiffResponse,
    AddedWorkerTask,
    RemovedWorkerTask,
    UpdatedWorkerTask,
    ImpactedTask,
    AdjustPlanSimpleRequest,
    SchedulingConfig
} from '../types';
import { getPlanWithSnapshot } from '../models/planModel';
import { resolveSchedulingConfig } from '../utils/schedulingConfig';

export class PlanAdjustmentService {
    /**
     * Phase 2: Build Current State
     * Reconstructs the state of the shop floor at `currentTime` based on the previous plan.
     */
    public buildCurrentState(
        originalAssignments: WorkerTask[],
        currentTimeStr: string
    ): CurrentAssignment[] {
        const currentTime = new Date(currentTimeStr).getTime();
        const currentAssignments: CurrentAssignment[] = [];

        for (const assignment of originalAssignments) {
            // Skip if no task. Allow null workerId for Wait Tasks (using placeholder).
            if (!assignment.taskId) continue;
            // if (!assignment.workerId && !assignment.isWaitTask) continue; // removed specific check to allow wait tasks


            const start = new Date(assignment.startDate).getTime();
            const end = new Date(assignment.endDate).getTime();

            // Active Intersection check
            if (currentTime >= start && currentTime < end) {
                const hoursWorkedSoFar = (currentTime - start) / (1000 * 60 * 60);

                currentAssignments.push({
                    workerId: assignment.workerId || '__WAIT__',
                    taskId: assignment.taskId,
                    startTime: assignment.startDate,
                    expectedEndTime: assignment.endDate,
                    hoursWorkedOnTask: Math.max(0, hoursWorkedSoFar)
                });
            }
        }

        return currentAssignments;
    }

    /**
     * Phase 3: Replan Algorithm (Core)
     * Replans all incomplete tasks starting from `currentTime`.
     * Applies a penalty if a worker is switched from their `currentAssignment`.
     */
    public planWithPenalty(
        currentTimeStr: string,
        allTasks: Task[],
        allWorkers: Worker[],
        currentAssignments: CurrentAssignment[],
        preferences: AdjustPlanPreferences = {},
        originalAssignments: WorkerTask[] = [],
        scheduling?: SchedulingConfig
    ): WorkerTask[] {
        const startTime = new Date(currentTimeStr).getTime();
        const penalty = preferences.reassignmentPenalty ?? 500; // Default 500
        const schedulePenalty = preferences.scheduleDeviationPenalty ?? (penalty * 2);
        const schedulingConfig = resolveSchedulingConfig(scheduling);
        const stepMs = schedulingConfig.timeStepMinutes * 60 * 1000;
        const minAssignmentMs = schedulingConfig.minAssignmentMinutes * 60 * 1000;
        const transitionGapMs = schedulingConfig.transitionGapMs;
        const preferredTaskByWorkerTime = this.buildPreferredTaskMap(originalAssignments, stepMs);

        // 1. Initialize Simulation State (Estimates)
        // We need "Effective Remaining Hours" for tasks based on "Updates" passed from Controller?
        // Wait, the Service needs `allTasks` to have the UPDATED Remaining Hours!
        // The Controller must patch `allTasks` before calling this.
        const taskState = new Map(allTasks.map(t => [t.taskId, {
            ...t,
            remainingHours: t.estimatedRemainingLaborHours ?? t.estimatedTotalLaborHours ?? 0,
            isComplete: (t.estimatedRemainingLaborHours ?? t.estimatedTotalLaborHours ?? 0) <= 0
        }]));


        const workerCurrentTask = new Map<string, string>();
        currentAssignments.forEach(ca => {
            if (ca.workerId === '__WAIT__') {
                const t = taskState.get(ca.taskId);
                if (t && ca.startTime) {
                    (t as any).waitStartTime = new Date(ca.startTime).getTime();
                }
            } else {
                workerCurrentTask.set(ca.workerId, ca.taskId);
            }
        });

        const workerAvailability = new Map(allWorkers.map(w => {
            const availability = w.availability
                ? (Array.isArray(w.availability) ? w.availability : [w.availability])
                : [];
            const parsed = availability.map(a => ({
                start: new Date(a.startTime).getTime(),
                end: new Date(a.endTime).getTime()
            }));
            return [w.workerId, parsed];
        }));

        const newAssignments: WorkerTask[] = [];
        const lastAssignmentByWorker = new Map<string, { taskId: string; endMs: number }>();
        const workerLocks = new Map<string, { taskId: string; lockUntilMs: number }>();
        let simulationTime = startTime;
        const MAX_TIME = startTime + (28 * 24 * 60 * 60 * 1000);
        const getRecentTaskId = (workerId: string, referenceTime: number): string | undefined => {
            const lastAssignment = lastAssignmentByWorker.get(workerId);
            if (lastAssignment) {
                const delta = referenceTime - lastAssignment.endMs;
                const withinGap = delta >= 0 && (transitionGapMs > 0 ? delta <= transitionGapMs : delta === 0);
                if (withinGap) {
                    return lastAssignment.taskId;
                }
            }
            return workerCurrentTask.get(workerId);
        };
        const getActiveLock = (workerId: string, referenceTime: number) => {
            const lock = workerLocks.get(workerId);
            if (!lock) return undefined;
            if (referenceTime >= lock.lockUntilMs) {
                workerLocks.delete(workerId);
                return undefined;
            }
            return lock;
        };

        // Simulation Loop
        while (simulationTime < MAX_TIME) {
            const incomplete = Array.from(taskState.values()).filter(t => !t.isComplete);
            if (incomplete.length === 0) break;

            // 1. Find Available Workers
            const availableWorkersForStep = allWorkers.filter(w => {
                const intervals = workerAvailability.get(w.workerId) || [];
                if (!w.availability) return true;
                return intervals.some(iv => simulationTime >= iv.start && simulationTime < iv.end);
            });

            // FIX: Don't skip step just because no workers available if we have Wait Task progress!
            // Identify Ready Tasks (Logic duplication from PlanningService, simplified here)
            // We need to know which incomplete tasks are READY (all prereqs complete)

            const getReadyIncomplete = () => {
                return Array.from(taskState.values()).filter(t => {
                    if (t.isComplete) return false;
                    // Check Prereqs
                    if (t.prerequisiteTaskIds && t.prerequisiteTaskIds.length > 0) {
                        const allPrereqsDone = t.prerequisiteTaskIds.every(pid => {
                            const pState = taskState.get(pid);
                            return pState && pState.isComplete;
                        });
                        if (!allPrereqsDone) return false;
                    }
                    // Check Earliest Start
                    if (t.earliestStartDate) {
                        const start = new Date(t.earliestStartDate).getTime();
                        if (!isNaN(start) && simulationTime < start) return false;
                    }
                    return true;
                });
            };

            // --- A. Handle Wait Tasks Iteratively ---
            let waitCheckPass = 0;
            const recordedWaitTasks = new Set<string>();
            let anyWaitTaskActive = false;

            while (waitCheckPass < 10) {
                const readyIncomplete = getReadyIncomplete();
                const waitTasks = readyIncomplete.filter(t =>
                    (t.taskType === 'nonWorker' || (t.nonWorkerTaskDuration !== undefined && t.nonWorkerTaskDuration > 0) || (t.minWorkers === 0 && t.maxWorkers === 0))
                );

                if (waitTasks.length === 0) break;

                let progressMade = false;
                waitTasks.forEach(t => {
                    anyWaitTaskActive = true;
                    // Start wait if not started
                    // We need to store waitStartTime on the task state object (it has extra props)
                    // The Map contains { ...t, remainingHours, isComplete }
                    // We'll cast to any to access waitStartTime as it's not in Task interface
                    const tState = t as any;
                    if (tState.waitStartTime === undefined) {
                        tState.waitStartTime = simulationTime;
                    }

                    // Duration logic
                    const durationHours = t.nonWorkerTaskDuration ?? t.estimatedTotalLaborHours ?? 0;
                    const durationMs = durationHours * 60 * 60 * 1000;
                    const elapsed = simulationTime - tState.waitStartTime;

                    if (elapsed >= durationMs) {
                        t.isComplete = true;
                        t.remainingHours = 0; // Ensure 0
                        progressMade = true;

                        // Record final assignment block? 
                        // Actually, we record step-by-step
                    } else {
                        // Decrease remaining
                        const remainingMs = Math.max(0, durationMs - elapsed);
                        t.remainingHours = remainingMs / (1000 * 60 * 60);

                        if (!t.isComplete) {
                            if (!recordedWaitTasks.has(t.taskId)) {
                                newAssignments.push({
                                    workerId: null,
                                    taskId: t.taskId,
                                    startDate: new Date(simulationTime).toISOString(),
                                    endDate: new Date(simulationTime + stepMs).toISOString(),
                                    isWaitTask: true
                                });
                                recordedWaitTasks.add(t.taskId);
                            }
                        }
                    }
                });

                if (!progressMade) break;
                waitCheckPass++;
            }

            // If no workers AND no wait task activity, skip step
            if (availableWorkersForStep.length === 0 && !anyWaitTaskActive) {
                simulationTime += stepMs;
                continue;
            }

            // 2. Sort Labor Tasks (Priority)
            // Filter out Wait Tasks for labor assignment
            const laborTasks = getReadyIncomplete().filter(t =>
                !((t.taskType === 'nonWorker' || (t.nonWorkerTaskDuration !== undefined && t.nonWorkerTaskDuration > 0) || (t.minWorkers === 0 && t.maxWorkers === 0)))
            );

            laborTasks.sort((a, b) => {
                // Stick-to-task heuristic... (Same sort logic)
                return b.remainingHours - a.remainingHours;
            });

            const assignedWorkersInStep = new Set<string>();

            // 3. Assign Workers
            for (const task of laborTasks) {
                if (task.earliestStartDate) {
                    const earliestStart = new Date(task.earliestStartDate).getTime();
                    if (!isNaN(earliestStart) && simulationTime < earliestStart) {
                        continue;
                    }
                }
                const maxW = task.maxWorkers || 1;
                let assignedCount = 0;

                const candidates = availableWorkersForStep.filter(w => {
                    if (assignedWorkersInStep.has(w.workerId)) return false;
                    const lock = getActiveLock(w.workerId, simulationTime);
                    if (lock && lock.taskId !== task.taskId) return false;
                    return true;
                });

                const scoredCandidates = candidates.map(w => {
                    let score = 1000;

                    const lock = getActiveLock(w.workerId, simulationTime);
                    if (lock && lock.taskId === task.taskId) {
                        score += 5000;
                    }

                    // Check previous step assignment
                    const lastTaskId = getRecentTaskId(w.workerId, simulationTime);

                    if (lastTaskId === task.taskId) {
                        score += 2000; // Bonus for continuity
                    } else if (lastTaskId) {
                        score -= penalty; // Penalty for switching
                    }

                    const workerTimeMap = preferredTaskByWorkerTime.get(w.workerId);
                    if (workerTimeMap) {
                        const slot = Math.floor(simulationTime / stepMs) * stepMs;
                        const preferredTaskId = workerTimeMap.get(slot);
                        if (preferredTaskId) {
                            score += preferredTaskId === task.taskId ? schedulePenalty : -schedulePenalty;
                        }
                    }

                    return { worker: w, score };
                });

                scoredCandidates.sort((a, b) => b.score - a.score);

                for (const candidate of scoredCandidates) {
                    if (assignedCount >= maxW) break;

                    const w = candidate.worker;
                    const lastAssignment = lastAssignmentByWorker.get(w.workerId);
                    let workerStartTime = simulationTime;
                    if (transitionGapMs > 0 && lastAssignment && lastAssignment.taskId !== task.taskId) {
                        const gapReady = lastAssignment.endMs + transitionGapMs;
                        if (gapReady > workerStartTime) {
                            workerStartTime = gapReady;
                        }
                    }

                    const endMs = simulationTime + stepMs;
                    if (workerStartTime >= endMs) {
                        continue;
                    }

                    const startIso = new Date(workerStartTime).toISOString();
                    const endIso = new Date(endMs).toISOString();
                    const actualDurationMs = endMs - workerStartTime;

                    const activeLock = getActiveLock(w.workerId, workerStartTime);
                    const previousTaskId = activeLock?.taskId || getRecentTaskId(w.workerId, workerStartTime);
                    const isSameTask = previousTaskId === task.taskId;
                    const remainingWorkMs = task.remainingHours * 60 * 60 * 1000;
                    if (!isSameTask && remainingWorkMs < minAssignmentMs) {
                        continue;
                    }

                    if (!isSameTask) {
                        const lockUntilMs = workerStartTime + minAssignmentMs;
                        const existingLock = workerLocks.get(w.workerId);
                        if (!existingLock || existingLock.taskId !== task.taskId || existingLock.lockUntilMs < lockUntilMs) {
                            workerLocks.set(w.workerId, { taskId: task.taskId, lockUntilMs });
                        }
                    }

                    assignedWorkersInStep.add(w.workerId);
                    assignedCount++;

                    newAssignments.push({
                        workerId: w.workerId,
                        taskId: task.taskId,
                        startDate: startIso,
                        endDate: endIso
                    });

                    lastAssignmentByWorker.set(w.workerId, { taskId: task.taskId, endMs });

                    // Update task hours
                    task.remainingHours -= (actualDurationMs / (1000 * 60 * 60));
                    if (task.remainingHours <= 0) {
                        task.isComplete = true;
                        task.remainingHours = 0;
                        break;
                    }
                }
            }
            simulationTime += stepMs;
        }

        return this.consolidateAssignments(newAssignments);
    }

    public async adjustPlanReplanFromPlanId(
        planId: string,
        request: AdjustPlanSimpleRequest
    ): Promise<AdjustPlanDiffResponse> {
        // 1. Fetch Plan with Output & Snapshot
        const plan = await getPlanWithSnapshot(planId);
        if (!plan) throw new Error(`Plan ${planId} not found`);
        if (!plan.inputSnapshot) throw new Error(`Plan ${planId} has no input snapshot (cannot replan)`);

        // 2. Extract Data from Snapshot
        const snapshot = plan.inputSnapshot as any;
        const allTasks: Task[] = snapshot.tasks || [];
        const allWorkers: Worker[] = snapshot.workers || [];

        // 3. Reconstruct Original Assignments from DB
        const originalAssignments: WorkerTask[] = plan.assignments.map(a => ({
            workerId: a.workerId,
            taskId: a.taskId,
            taskName: '', // Optional
            startDate: a.startTime.toISOString(),
            endDate: a.endTime.toISOString(),
            shiftId: a.shiftId || undefined
        }));

        // 4. Delegate to Core Logic
        // Note: request.tasks/workers are ignored here; we use the snapshot
        return this.adjustPlanReplan(originalAssignments, allTasks, allWorkers, request);
    }

    /**
     * Orchestrates the "Stable Replan" flow:
     * 1. Snapshot Current State
     * 2. Replan with Penalty
     * 3. Compute Diff
     */
    public async adjustPlanReplan(
        originalAssignments: WorkerTask[],
        allTasks: Task[],
        allWorkers: Worker[],
        request: AdjustPlanSimpleRequest
    ): Promise<AdjustPlanDiffResponse> {
        resolveSchedulingConfig(request.scheduling);

        // 0. Handle Added/Removed Tasks
        if (request.addedTasks && request.addedTasks.length > 0) {
            // Append new tasks, avoiding duplicates if they somehow exist
            const existingIds = new Set(allTasks.map(t => t.taskId));
            request.addedTasks.forEach(t => {
                if (!existingIds.has(t.taskId)) {
                    allTasks.push(t);
                }
            });
        }

        if (request.removedTaskIds && request.removedTaskIds.length > 0) {
            const removedSet = new Set(request.removedTaskIds);
            // We filter them out from the working set.
            // Note: This effectively "deletes" them from consideration for future planning.
            // Historical work calc handles assignments directly so this is safe.
            allTasks = allTasks.filter(t => !removedSet.has(t.taskId));
            originalAssignments = originalAssignments.filter(a => !a.taskId || !removedSet.has(a.taskId));
        }

        const normalizedAssignments = this.addSyntheticWaitTasks(originalAssignments, allTasks);

        // 1. Build Current State
        const currentAssignments = this.buildCurrentState(normalizedAssignments, request.currentTime);

        // 2. Patch Tasks with Updates
        // logic: Effective Remaining = (Snapshot Total - Historical Work) OR (Client Update)
        const currentTime = new Date(request.currentTime).getTime();

        const historicalWorkMap = new Map<string, number>();
        normalizedAssignments.forEach(a => {
            if (!a.taskId) return;
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();
            // Only count work BEFORE currentTime
            if (start < currentTime) {
                const effectiveEnd = Math.min(end, currentTime);
                const durationHours = (effectiveEnd - start) / (1000 * 60 * 60);
                const current = historicalWorkMap.get(a.taskId) || 0;
                historicalWorkMap.set(a.taskId, current + durationHours);
            }
        });

        const baselineRemainingMap = new Map<string, number>();
        allTasks.forEach(t => {
            const history = historicalWorkMap.get(t.taskId) || 0;
            // FIX: For non-worker tasks, use duration, not labor hours
            let originalTotal = t.estimatedTotalLaborHours || t.estimatedRemainingLaborHours || 0;
            if (t.taskType === 'nonWorker' || (t.minWorkers === 0 && t.maxWorkers === 0)) {
                originalTotal = t.nonWorkerTaskDuration || 0;
            }
            baselineRemainingMap.set(t.taskId, Math.max(0, originalTotal - history));
        });


        let netDelta = 0;
        request.updates.forEach(update => {
            const task = allTasks.find(t => t.taskId === update.taskId);
            if (!task) return;

            const interpretAs = update.interpretAs || 'total'; // Default: user provides new TOTAL

            // FIX: Handle non-worker tasks
            let originalTotal = task.estimatedTotalLaborHours || task.estimatedRemainingLaborHours || 0;
            if (task.taskType === 'nonWorker' || (task.minWorkers === 0 && task.maxWorkers === 0)) {
                originalTotal = task.nonWorkerTaskDuration || 0;
            }

            const workDone = historicalWorkMap.get(update.taskId) || 0;
            const baselineRemaining = Math.max(0, originalTotal - workDone);

            let delta: number;
            if (interpretAs === 'total') {
                // User input = new total hours for task
                // Delta = how much more/less than original total
                delta = update.laborHoursRemaining - originalTotal;
            } else {
                // User input = actual remaining from now
                delta = update.laborHoursRemaining - baselineRemaining;
            }

            if (Math.abs(delta) > 0.0001) {
                netDelta += delta;
            }
        });

        const enforceNoPullEarlier = netDelta > 0.01;
        const earliestStartMap = enforceNoPullEarlier ? this.getTaskStartHelper(normalizedAssignments) : new Map<string, number>();
        const updatedTaskIds = new Set(request.updates.map(u => u.taskId));

        const patchedTasks = allTasks.map(t => {
            // Priority 1: Client Update
            const update = request.updates.find((u: { taskId: string; laborHoursRemaining: number }) => u.taskId === t.taskId);

            // Helper to check if non-worker
            const isNonWorker = t.taskType === 'nonWorker' || (t.minWorkers === 0 && t.maxWorkers === 0);

            if (update) {
                const interpretAs = update.interpretAs || 'total';
                const history = historicalWorkMap.get(t.taskId) || 0;

                let newRemaining: number;
                if (interpretAs === 'total') {
                    newRemaining = Math.max(0, update.laborHoursRemaining - history);
                } else {
                    newRemaining = update.laborHoursRemaining;
                }

                return {
                    ...t,
                    estimatedRemainingLaborHours: isNonWorker ? 0 : newRemaining,
                    nonWorkerTaskDuration: isNonWorker ? newRemaining : t.nonWorkerTaskDuration, // Update duration for non-workers
                    earliestStartDate: enforceNoPullEarlier && earliestStartMap.has(t.taskId)
                        ? new Date(earliestStartMap.get(t.taskId) as number).toISOString()
                        : t.earliestStartDate
                };
            }

            // Priority 2: Calculated Remaining (Snapshot - History)
            const history = historicalWorkMap.get(t.taskId) || 0;
            let originalTotal = t.estimatedTotalLaborHours || t.estimatedRemainingLaborHours || 0; // Snapshot total
            if (isNonWorker) {
                originalTotal = t.nonWorkerTaskDuration || 0;
            }

            const remaining = Math.max(0, originalTotal - history);

            return {
                ...t,
                estimatedRemainingLaborHours: isNonWorker ? 0 : remaining,
                nonWorkerTaskDuration: isNonWorker ? remaining : t.nonWorkerTaskDuration,
                earliestStartDate: enforceNoPullEarlier && earliestStartMap.has(t.taskId)
                    ? new Date(earliestStartMap.get(t.taskId) as number).toISOString()
                    : t.earliestStartDate
            };
        });

        // 2b. Patch Workers with Availability Updates
        const patchedWorkers = allWorkers.map(w => {
            const update = request.workerUpdates?.find(u => u.workerId === w.workerId);
            if (update) {
                // Override availability
                return {
                    ...w,
                    availability: {
                        startTime: update.availability.startTime,
                        endTime: update.availability.endTime
                    }
                };
            }
            return w;
        });

        // 3. Minimal-diff adjustment (preserve schedule shape)
        const deltaMap = new Map<string, number>();
        const anchorAtCurrentTimeMap = new Map<string, boolean>();
        request.updates.forEach(update => {
            const task = allTasks.find(t => t.taskId === update.taskId);
            if (!task) return;

            const interpretAs = update.interpretAs || 'total'; // Default: user provides new TOTAL
            anchorAtCurrentTimeMap.set(update.taskId, interpretAs === 'remaining');

            // FIX: Handle non-worker tasks
            let originalTotal = task.estimatedTotalLaborHours || task.estimatedRemainingLaborHours || 0;
            if (task.taskType === 'nonWorker' || (task.minWorkers === 0 && task.maxWorkers === 0)) {
                originalTotal = task.nonWorkerTaskDuration || 0;
            }

            const workDone = historicalWorkMap.get(update.taskId) || 0;
            const baselineRemaining = Math.max(0, originalTotal - workDone);

            let delta: number;
            if (interpretAs === 'total') {
                // User input = new total hours for task
                // Delta = how much more/less than original total
                delta = update.laborHoursRemaining - originalTotal;
            } else {
                // User input = actual remaining from now
                delta = update.laborHoursRemaining - baselineRemaining;
            }

            if (Math.abs(delta) > 0.0001) {
                deltaMap.set(update.taskId, delta);
            }
        });

        const dependentsMap = this.buildDependentsMap(allTasks, normalizedAssignments);
        const downstreamTaskIds = this.collectDownstreamTaskIds(updatedTaskIds, dependentsMap);

        const originalFutureAssignments = normalizedAssignments.filter(a => {
            const endMs = new Date(a.endDate).getTime();
            if (endMs > currentTime) return true;
            if (a.taskId && downstreamTaskIds.has(a.taskId)) return true;
            return false;
        });

        // Deep copy for mutation
        const shiftedAssignments = originalFutureAssignments.map(a => ({ ...a }));

        // NEW: Apply Worker Shifts (Late Arrival / Schedule Change)
        // If a worker's start time changes, shift their assignments to match.
        if (request.workerUpdates) {
            request.workerUpdates.forEach(update => {
                const originalWorker = allWorkers.find(w => w.workerId === update.workerId);
                if (!originalWorker || !originalWorker.availability) return;

                // Simple check for "Late Start": New Start > Old Start
                const oldStartStr = Array.isArray(originalWorker.availability)
                    ? originalWorker.availability[0].startTime
                    : (originalWorker.availability as any).startTime;

                // If we can't determine old start, skip
                if (!oldStartStr) return;

                const oldStart = new Date(oldStartStr).getTime();
                const newStart = new Date(update.availability.startTime).getTime();

                if (newStart > oldStart) {
                    const shiftMs = newStart - oldStart;
                    if (shiftMs > 0) {
                        const workerAssigns = shiftedAssignments.filter(a => a.workerId === update.workerId);
                        workerAssigns.forEach(a => {
                            const s = new Date(a.startDate).getTime();
                            const e = new Date(a.endDate).getTime();
                            a.startDate = new Date(s + shiftMs).toISOString();
                            a.endDate = new Date(e + shiftMs).toISOString();
                        });
                    }
                }
            });
        }

        let newAssignments = this.applyMinimalDiffAdjustments(
            shiftedAssignments,
            patchedTasks,
            deltaMap,
            currentTime,
            anchorAtCurrentTimeMap
        );

        if (request.workerUpdates && request.workerUpdates.length > 0) {
            newAssignments = this.applyWorkerAvailabilityConstraints(
                newAssignments,
                request.workerUpdates
            );
        }

        if (enforceNoPullEarlier) {
            newAssignments = this.enforceNoEarlyFinish(newAssignments, normalizedAssignments, updatedTaskIds);
        }

        // 3b. Handle Added/Orphaned Tasks (NEW)
        // If we added tasks (or if adjustment dropped them), they might be "orphaned" (not in newAssignments).
        // identifying orphaned tasks that still have work remaining
        const scheduledTaskIds = new Set(newAssignments.map(a => a.taskId));
        const orphanedTasks = patchedTasks.filter(t =>
            !scheduledTaskIds.has(t.taskId) &&
            (t.estimatedRemainingLaborHours ?? 0) > 0.01
        );

        if (orphanedTasks.length > 0) {
            // We need to find slots for these tasks without disturbing newAssignments.
            // Strategy: Calculate "Free" availability for each worker by subtracting newAssignments from their availability.
            const busyMap = new Map<string, Array<{ start: number, end: number }>>();
            newAssignments.forEach(a => {
                if (!a.workerId) return;
                const list = busyMap.get(a.workerId) || [];
                list.push({ start: new Date(a.startDate).getTime(), end: new Date(a.endDate).getTime() });
                busyMap.set(a.workerId, list);
            });

            // Patch workers with "Remaining Availability"
            // We need to take into account BOTH original availability AND workerUpdates (from request)
            // The `applyWorkerAvailabilityConstraints` handled updates, but patchedWorkers (line 445) also has them?
            // Yes, line 445: patchedWorkers has updated availability.

            const freeWorkers = patchedWorkers.map(w => {
                const baseIntervals = w.availability
                    ? (Array.isArray(w.availability) ? w.availability : [w.availability])
                    : [];

                // Convert to numeric intervals
                let freeIntervals = baseIntervals.map(i => ({
                    start: new Date(i.startTime).getTime(),
                    end: new Date(i.endTime).getTime()
                }));

                // Subtract busy intervals
                const busy = busyMap.get(w.workerId) || [];
                // Simple subtraction logic
                busy.forEach(b => {
                    const newFree: typeof freeIntervals = [];
                    freeIntervals.forEach(f => {
                        // Subtract b from f -> can result in 0, 1, or 2 intervals
                        if (b.end <= f.start || b.start >= f.end) {
                            // No overlap
                            newFree.push(f);
                        } else {
                            // Overlap
                            if (b.start > f.start) {
                                newFree.push({ start: f.start, end: b.start });
                            }
                            if (b.end < f.end) {
                                newFree.push({ start: b.end, end: f.end });
                            }
                        }
                    });
                    freeIntervals = newFree;
                });

                // Filter invalid/short intervals
                freeIntervals = freeIntervals.filter(i => i.end > i.start);

                return {
                    ...w,
                    availability: freeIntervals.map(i => ({
                        startTime: new Date(i.start).toISOString(),
                        endTime: new Date(i.end).toISOString()
                    }))
                };
            });

            // Run planWithPenalty for orphans
            // We treat "currentTime" as the simulation start.
            const orphanAssignments = this.planWithPenalty(
                request.currentTime,
                orphanedTasks,
                freeWorkers,
                [], // No "current assignments" for orphans (they are new)
                request.preferences,
                [], // No original assignments for orphans
                request.scheduling
            );

            newAssignments.push(...orphanAssignments);
        }

        // 4. Diff
        // Note: buildDiff logic assumes "originalAssignments" covers the whole horizon?
        // Yes, we pass the full original list.
        // But New Assignments are ONLY from currentTime onwards.
        // We need to MERGE past assignments with new ones to create a "Full New Plan" for diffing?
        // OR buildDiff handles partial overlap?
        // My buildDiff logic: "If strict match (same times), no diff."
        // If we don't pass PAST assignments in `newAssignments`, the Diff will say "REMOVED" for all past tasks.
        // FIX: Prepend past assignments to newAssignments before Diffing.

        const pastAssignments = normalizedAssignments.filter(a => {
            // Include if End Time <= currentTime?
            // "Active" tasks are split at currentTime?
            // Current State logic handles "Active".
            // So we strictly take tasks that ENDED before currentTime.
            const end = new Date(a.endDate).getTime();
            const now = new Date(request.currentTime).getTime();
            return end <= now;
        });

        // Note: For active tasks, "buildCurrentState" captures their partial progress.
        // "planWithPenalty" schedules the *rest* of them.
        // So we need to stitch: Past + (Active-Partial?) + New.
        // Actually `planWithPenalty` output should be the New Forward Schedule.
        // The "Active-Partial" is implicitly strictly strictly "History".
        // Wait, if a worker is 50% done with Task A at 12:00.
        // Assignments: [8:00 - 16:00] (Original)
        // Now it's 12:00.
        // Replan: Task A needs 4 more hours.
        // New Assignment: [12:00 - 16:00].
        // If we only add Past [8-12] + New [12-16], we get 2 assignments.
        // Consolidate?
        // My diff logic compares sessions.
        // To avoid "REMOVED" on the original 8-16, we should reconstruct the full 8-16 block if possible.
        // `activeAssignments` needs to be split if we do strict cut.

        // Simpler for Phase 1: Just diff the FUTURE.
        // "Diff Rules... ADDED = new assignment... REMOVED = original assignment... "
        // If we assume the UI applies this diff to its dataset...
        // If we say REMOVE [8-16] and ADD [12-16], the UI loses the 8-12 history. Bad.

        // Strategy: Filter `originalAssignments` in `buildDiff` to only compare `startTime >= currentTime`.
        // Leave the past alone.

        // Let's modify `buildDiff` usage or logic?
        // Better: Pass `originalFutureAssignments` to `buildDiff`.
        // Filter original to start >= now?
        // Or End > now.
        return this.buildDiff(originalFutureAssignments, newAssignments, patchedTasks, allWorkers, request.currentTime);
    }

    /**
     * Phase 4: Diff Generation
     */
    public buildDiff(
        originalAssignments: WorkerTask[],
        newAssignments: WorkerTask[],
        tasks: Task[],
        allWorkers?: Worker[],
        currentTimeStr?: string
    ): AdjustPlanDiffResponse {
        const addedWorkerTasks: AddedWorkerTask[] = [];
        const removedWorkerTasks: RemovedWorkerTask[] = [];
        const updatedWorkerTasks: UpdatedWorkerTask[] = [];
        const impactedTasks: ImpactedTask[] = [];

        // Helper: normalize ISO
        const normalize = (d: string) => new Date(d).toISOString();
        const makeKey = (a: WorkerTask) => `${a.workerId || '__wait__'}|${a.taskId}|${normalize(a.startDate)}`;

        const origSessions = new Map<string, WorkerTask>();
        originalAssignments.forEach(a => {
            if (!a.taskId) return; // WorkerID optional for wait tasks
            origSessions.set(makeKey(a), a);
        });

        const newSessions = new Map<string, WorkerTask>();
        newAssignments.forEach(a => {
            if (!a.taskId) return; // WorkerID optional for wait tasks
            newSessions.set(makeKey(a), a);
        });

        // Removed & Updated
        origSessions.forEach((orig, key) => {
            const newItem = newSessions.get(key);
            if (newItem) {
                if (normalize(newItem.endDate) !== normalize(orig.endDate)) {
                    updatedWorkerTasks.push({
                        workerId: orig.workerId!,
                        taskId: orig.taskId!,
                        startDate: normalize(newItem.startDate),
                        endDate: normalize(newItem.endDate),
                        previousEndDate: normalize(orig.endDate)
                    });
                }
            } else {
                removedWorkerTasks.push({
                    workerId: orig.workerId!,
                    taskId: orig.taskId!,
                    startDate: normalize(orig.startDate),
                    endDate: normalize(orig.endDate)
                });
            }
        });

        // Added
        newSessions.forEach((newItem, key) => {
            if (!origSessions.has(key)) {
                addedWorkerTasks.push({
                    workerId: newItem.workerId!,
                    taskId: newItem.taskId!,
                    startDate: normalize(newItem.startDate),
                    endDate: normalize(newItem.endDate)
                });
            }
        });

        // Impacted Tasks
        const origEnds = this.getTaskEndHelper(originalAssignments);
        const newEnds = this.getTaskEndHelper(newAssignments);
        const allTids = new Set([...origEnds.keys(), ...newEnds.keys()]);

        allTids.forEach(tid => {
            const oldEnd = origEnds.get(tid);
            const newEnd = newEnds.get(tid);

            if (oldEnd && newEnd) {
                let status: ImpactedTask['status'] = 'UNAFFECTED';
                if (newEnd > oldEnd) status = 'EXTENDED';
                else if (newEnd < oldEnd) status = 'SHORTENED';

                // Check Assignment Change
                const oldW = new Set(originalAssignments.filter(a => a.taskId === tid).map(a => a.workerId));
                const newW = new Set(newAssignments.filter(a => a.taskId === tid).map(a => a.workerId));
                let changed = false;
                oldW.forEach(w => { if (!newW.has(w)) changed = true; });
                newW.forEach(w => { if (!oldW.has(w)) changed = true; });

                if (changed && status === 'UNAFFECTED') status = 'REASSIGNED';

                if (status !== 'UNAFFECTED') {
                    impactedTasks.push({
                        taskId: tid,
                        status,
                        newEndDate: new Date(newEnd).toISOString(),
                        previousEndDate: new Date(oldEnd).toISOString()
                    });
                }
            }
        });

        // Deficits & Idle (New Logic)
        const deficitTasks: any[] = []; // Using any to match DeficitTask interface structure
        tasks.forEach(t => {
            if (t.estimatedRemainingLaborHours && t.estimatedRemainingLaborHours > 0.1) {
                deficitTasks.push({
                    taskId: t.taskId,
                    deficitHours: t.estimatedRemainingLaborHours,
                    requiredSkills: t.requiredSkills
                });
            }
        });

        const idleWorkers: { workerId: string; availableFrom: string }[] = [];
        if (allWorkers && currentTimeStr) {
            const workerBusyUntil = new Map<string, number>();
            allWorkers.forEach(w => workerBusyUntil.set(w.workerId, new Date(currentTimeStr).getTime()));

            newAssignments.forEach(a => {
                if (!a.workerId) return;
                const end = new Date(a.endDate).getTime();
                const current = workerBusyUntil.get(a.workerId) || 0;
                if (end > current) {
                    workerBusyUntil.set(a.workerId, end);
                }
            });

            // If a worker's last task ends near currentTime (or they have NO tasks), they are idle?
            // Let's say "availableFrom" is their last end time.
            workerBusyUntil.forEach((until, wid) => {
                idleWorkers.push({
                    workerId: wid,
                    availableFrom: new Date(until).toISOString()
                });
            });
        }

        return {
            version: new Date().toISOString(),
            addedWorkerTasks,
            removedWorkerTasks,
            updatedWorkerTasks,
            impactedTasks,
            deficitTasks,
            idleWorkers
        };
    }

    private applyWorkerAvailabilityConstraints(
        assignments: WorkerTask[],
        workerUpdates: { workerId: string; availability: { startTime: string; endTime: string } }[]
    ): WorkerTask[] {
        if (!workerUpdates || workerUpdates.length === 0) {
            return assignments;
        }

        // Build map: workerId -> { start: ms, end: ms }
        const workerAvailMap = new Map<string, { start: number; end: number }>();
        workerUpdates.forEach(update => {
            const start = new Date(update.availability.startTime).getTime();
            const end = new Date(update.availability.endTime).getTime();
            if (!isNaN(start) && !isNaN(end)) {
                workerAvailMap.set(update.workerId, { start, end });
            }
        });

        const result: WorkerTask[] = [];

        for (const assignment of assignments) {
            const workerId = assignment.workerId;
            if (!workerId) {
                result.push(assignment);
                continue;
            }

            const avail = workerAvailMap.get(workerId);
            if (!avail) {
                // Worker not updated, keep as-is
                result.push(assignment);
                continue;
            }

            const assignStart = new Date(assignment.startDate).getTime();
            const assignEnd = new Date(assignment.endDate).getTime();

            // Entirely outside window → remove
            if (assignEnd <= avail.start || assignStart >= avail.end) {
                continue;
            }

            // Entirely inside window → keep
            if (assignStart >= avail.start && assignEnd <= avail.end) {
                result.push(assignment);
                continue;
            }

            // Partial overlap → trim
            const trimmedStart = Math.max(assignStart, avail.start);
            const trimmedEnd = Math.min(assignEnd, avail.end);

            if (trimmedEnd > trimmedStart) {
                result.push({
                    ...assignment,
                    startDate: new Date(trimmedStart).toISOString(),
                    endDate: new Date(trimmedEnd).toISOString()
                });
            }
        }

        return result;
    }

    // --- Helpers ---

    private consolidateAssignments(items: WorkerTask[]): WorkerTask[] {
        if (items.length === 0) return [];
        const sorted = [...items].sort((a, b) => {
            const wA = a.workerId || '';
            const wB = b.workerId || '';
            if (wA !== wB) return wA.localeCompare(wB);
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        const merged: WorkerTask[] = [];
        let current = { ...sorted[0] };

        for (let i = 1; i < sorted.length; i++) {
            const item = sorted[i];
            const currEnd = new Date(current.endDate).getTime();
            const itemStart = new Date(item.startDate).getTime();

            if (item.workerId === current.workerId &&
                item.taskId === current.taskId &&
                Math.abs(itemStart - currEnd) < 60000) { // < 1 min gap
                current.endDate = item.endDate;
            } else {
                merged.push(current);
                current = { ...item };
            }
        }
        merged.push(current);
        return merged;
    }

    private addSyntheticWaitTasks(assignments: WorkerTask[], tasks: Task[]): WorkerTask[] {
        if (tasks.length === 0) return assignments;

        const normalized = assignments.map(a => ({ ...a }));
        const taskMap = new Map(tasks.map(t => [t.taskId, t]));

        // Tag existing non-labor tasks as wait tasks (useful for implicit dependency detection).
        normalized.forEach(a => {
            if (!a.taskId) return;
            const task = taskMap.get(a.taskId);
            if (task && this.isNonWorkerTask(task)) {
                if (!a.isWaitTask) {
                    a.isWaitTask = true;
                }
            }
        });

        const startMap = this.getTaskStartHelper(normalized);
        const endMap = this.getTaskEndHelper(normalized);
        const pending = tasks.filter(t => this.isNonWorkerTask(t) && !startMap.has(t.taskId));

        if (pending.length === 0) return normalized;

        let progress = true;
        let guard = 0;

        while (progress && guard < tasks.length) {
            progress = false;
            guard += 1;

            for (const task of pending) {
                if (startMap.has(task.taskId)) continue;

                const durationHours = this.getNonWorkerDurationHours(task);
                if (!durationHours || durationHours <= 0) continue;

                let anchorMs: number | undefined;

                if (task.prerequisiteTaskIds && task.prerequisiteTaskIds.length > 0) {
                    let maxEnd = 0;
                    let missing = false;
                    for (const prereqId of task.prerequisiteTaskIds) {
                        const end = endMap.get(prereqId);
                        if (!end) {
                            missing = true;
                            break;
                        }
                        if (end > maxEnd) maxEnd = end;
                    }
                    if (!missing && maxEnd > 0) {
                        anchorMs = maxEnd;
                    } else {
                        continue;
                    }
                }

                if (task.earliestStartDate) {
                    const earliest = new Date(task.earliestStartDate).getTime();
                    if (!isNaN(earliest)) {
                        anchorMs = anchorMs !== undefined ? Math.max(anchorMs, earliest) : earliest;
                    }
                }

                if (anchorMs === undefined) continue;

                const endMs = anchorMs + (durationHours * 60 * 60 * 1000);

                normalized.push({
                    workerId: null,
                    taskId: task.taskId,
                    startDate: new Date(anchorMs).toISOString(),
                    endDate: new Date(endMs).toISOString(),
                    isWaitTask: true
                });
                startMap.set(task.taskId, anchorMs);
                endMap.set(task.taskId, endMs);
                progress = true;
            }
        }

        return normalized;
    }

    private groupSessions(items: WorkerTask[]): Map<string, WorkerTask> {
        const map = new Map<string, WorkerTask>();
        items.forEach(item => {
            // Check for valid IDs
            if (!item.workerId || !item.taskId) return;
            const key = `${item.workerId}|${item.taskId}`;
            // If exists, existing one typically starts earlier if sorted.
            // But we didn't sort here.
            // Complex case: User works 8-12, then 1-5 on same task.
            // This naive grouping merges them or takes last?
            // "UPDATED" diff assumes singular assignment change.
            // Let's assume for diff purposes, we take the *bounding box* of the worker-task interaction?
            // Or just the latest one?
            // Let's take the one with largest EndDate to capture "Extension".
            const existing = map.get(key);
            if (!existing || new Date(item.endDate).getTime() > new Date(existing.endDate).getTime()) {
                map.set(key, item);
            }
        });
        return map;
    }

    private buildPreferredTaskMap(
        assignments: WorkerTask[],
        stepMs: number
    ): Map<string, Map<number, string>> {
        const map = new Map<string, Map<number, string>>();
        assignments.forEach(a => {
            if (!a.workerId || !a.taskId) return;
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();
            if (isNaN(start) || isNaN(end)) return;

            for (let t = start; t < end; t += stepMs) {
                const slot = Math.floor(t / stepMs) * stepMs;
                const workerMap = map.get(a.workerId) || new Map<number, string>();
                if (!workerMap.has(slot)) {
                    workerMap.set(slot, a.taskId);
                }
                map.set(a.workerId, workerMap);
            }
        });
        return map;
    }

    private applyMinimalDiffAdjustments(
        originalFutureAssignments: WorkerTask[],
        tasks: Task[],
        deltaMap: Map<string, number>,
        currentTimeMs: number,
        anchorAtCurrentTimeMap?: Map<string, boolean>
    ): WorkerTask[] {
        const assignments = originalFutureAssignments.map(a => ({ ...a }));
        const dependentsMap = this.buildDependentsMap(tasks, assignments);
        const taskMap = new Map<string, Task>();
        tasks.forEach(task => taskMap.set(task.taskId, task));

        const cascadeQueue: string[] = [];

        // Apply direct task deltas
        deltaMap.forEach((delta, taskId) => {
            if (Math.abs(delta) < 0.0001) return;
            const task = taskMap.get(taskId);
            if (!task) return;
            if (delta > 0) {
                const anchorAtCurrentTime = anchorAtCurrentTimeMap?.get(taskId) ?? false;
                const affectedTasks = this.extendTask(
                    assignments,
                    task,
                    delta,
                    currentTimeMs,
                    anchorAtCurrentTime
                );
                cascadeQueue.push(taskId, ...affectedTasks);
            } else {
                this.shortenTask(assignments, task, Math.abs(delta), currentTimeMs);
            }
        });

        // Cascade dependency shifts
        const lastProcessedEnd = new Map<string, number>();
        let guard = 0;
        while (cascadeQueue.length > 0 && guard < 10000) {
            guard += 1;
            const currentTaskId = cascadeQueue.shift() as string;

            const prereqEnd = this.getTaskEndHelper(assignments).get(currentTaskId);
            if (!prereqEnd) continue;
            const lastEnd = lastProcessedEnd.get(currentTaskId);
            if (lastEnd !== undefined && prereqEnd <= lastEnd) {
                continue;
            }
            lastProcessedEnd.set(currentTaskId, prereqEnd);

            const dependents = dependentsMap.get(currentTaskId) || [];
            dependents.forEach(depTaskId => {
                const depStart = this.getTaskStartHelper(assignments).get(depTaskId);
                if (depStart === undefined || depStart >= prereqEnd) return;

                const shiftMs = prereqEnd - depStart;
                const affected = this.shiftTask(assignments, depTaskId, shiftMs);
                cascadeQueue.push(depTaskId, ...affected);
            });
        }

        return assignments.filter(a => {
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();
            return !isNaN(start) && !isNaN(end) && end > start;
        });
    }

    private buildDependentsMap(tasks: Task[], assignments?: WorkerTask[]): Map<string, string[]> {
        const map = new Map<string, string[]>();

        // 1. Explicit dependencies from Task definitions
        tasks.forEach(task => {
            const prereqs = task.prerequisiteTaskIds || [];
            prereqs.forEach(pr => {
                const list = map.get(pr) || [];
                // Avoid duplicates
                if (!list.includes(task.taskId)) {
                    list.push(task.taskId);
                }
                map.set(pr, list);
            });
        });

        // 2. Implicit dependencies for "Wait" tasks (e.g. Dry Time)
        // If a Wait task starts exactly when another task ends, treat it as a dependent.
        if (assignments && assignments.length > 0) {
            const endTimes = new Map<number, string[]>(); // time -> [taskId]
            const waitTasks = new Set<string>();
            // Using helpers to get bounds
            const taskEnds = this.getTaskEndHelper(assignments);
            const taskStarts = this.getTaskStartHelper(assignments);
            const taskIsWait = new Set<string>();

            assignments.forEach(a => {
                if (a.isWaitTask && a.taskId) taskIsWait.add(a.taskId);
            });

            taskEnds.forEach((end, tId) => {
                if (taskIsWait.has(tId)) return; // Wait tasks are usually dependents, not prerequisites
                const list = endTimes.get(end) || [];
                list.push(tId);
                endTimes.set(end, list);
            });

            taskStarts.forEach((start, tId) => {
                if (taskIsWait.has(tId)) {
                    // Check if any task ended at this start time (1 min tolerance)
                    const tolerance = 60000;
                    let parents: string[] = [];
                    if (endTimes.has(start)) parents = endTimes.get(start)!;
                    else {
                        for (let [e, pIds] of endTimes.entries()) {
                            if (Math.abs(e - start) <= tolerance) {
                                parents = pIds;
                                break;
                            }
                        }
                    }

                    parents.forEach(pId => {
                        const list = map.get(pId) || [];
                        if (!list.includes(tId)) list.push(tId);
                        map.set(pId, list);
                    });
                }
            });
        }

        return map;
    }

    private collectDownstreamTaskIds(
        rootTaskIds: Set<string>,
        dependentsMap: Map<string, string[]>
    ): Set<string> {
        const result = new Set<string>();
        const queue: string[] = [];

        rootTaskIds.forEach(taskId => {
            result.add(taskId);
            queue.push(taskId);
        });

        while (queue.length > 0) {
            const current = queue.shift() as string;
            const dependents = dependentsMap.get(current) || [];
            dependents.forEach(depId => {
                if (!result.has(depId)) {
                    result.add(depId);
                    queue.push(depId);
                }
            });
        }

        return result;
    }

    private isNonWorkerTask(task: Task): boolean {
        return task.taskType === 'nonWorker'
            || (typeof task.nonWorkerTaskDuration === 'number' && task.nonWorkerTaskDuration > 0)
            || (task.minWorkers === 0 && task.maxWorkers === 0);
    }

    private getNonWorkerDurationHours(task: Task): number | undefined {
        if (typeof task.nonWorkerTaskDuration === 'number' && Number.isFinite(task.nonWorkerTaskDuration)) {
            return task.nonWorkerTaskDuration > 0 ? task.nonWorkerTaskDuration : undefined;
        }
        if (this.isNonWorkerTask(task)) {
            const fallback = task.estimatedTotalLaborHours ?? task.estimatedRemainingLaborHours;
            if (typeof fallback === 'number' && Number.isFinite(fallback)) {
                return fallback > 0 ? fallback : undefined;
            }
        }
        return undefined;
    }

    private extendTask(
        assignments: WorkerTask[],
        task: Task,
        deltaHours: number,
        currentTimeMs: number,
        anchorAtCurrentTime: boolean
    ): string[] {
        const taskAssigns = assignments
            .filter(a => a.taskId === task.taskId)
            .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

        if (taskAssigns.length === 0) {
            return [];
        }

        const byWorker = new Map<string, WorkerTask>();
        taskAssigns.forEach(a => {
            const workerKey = a.workerId || '__none__';
            const existing = byWorker.get(workerKey);
            if (!existing || new Date(a.endDate).getTime() > new Date(existing.endDate).getTime()) {
                byWorker.set(workerKey, a);
            }
        });

        const workerAssignmentsMap = new Map<string, WorkerTask[]>();
        assignments.forEach(a => {
            if (!a.workerId) return;
            const list = workerAssignmentsMap.get(a.workerId) || [];
            list.push(a);
            workerAssignmentsMap.set(a.workerId, list);
        });
        workerAssignmentsMap.forEach(list => {
            list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        });

        const candidates = Array.from(byWorker.entries()).map(([workerKey, lastAssign]) => {
            const endMs = new Date(lastAssign.endDate).getTime();
            let slackMs = Number.POSITIVE_INFINITY;
            if (workerKey !== '__none__') {
                const workerList = workerAssignmentsMap.get(workerKey) || [];
                const next = workerList.find(a => {
                    const startMs = new Date(a.startDate).getTime();
                    return a.taskId !== task.taskId && startMs >= endMs;
                });
                if (next) {
                    slackMs = Math.max(0, new Date(next.startDate).getTime() - endMs);
                }
            }
            return {
                workerKey,
                assignment: lastAssign,
                slackMs
            };
        });

        candidates.sort((a, b) => b.slackMs - a.slackMs);

        let targetCount = 1;
        if (task.minWorkers && task.minWorkers > 0) {
            targetCount = task.minWorkers;
        }
        targetCount = Math.min(targetCount, candidates.length);

        const perWorkerMs = (deltaHours * 60 * 60 * 1000) / targetCount;
        const affectedTasks: string[] = [];

        candidates.slice(0, targetCount).forEach(candidate => {
            const lastAssign = candidate.assignment;
            const endMs = new Date(lastAssign.endDate).getTime();
            const baseEndMs = anchorAtCurrentTime && endMs <= currentTimeMs
                ? currentTimeMs
                : endMs;
            const newEndMs = baseEndMs + perWorkerMs;
            lastAssign.endDate = new Date(newEndMs).toISOString();

            if (candidate.workerKey !== '__none__') {
                const shiftedTasks = this.pushWorkerSchedule(assignments, candidate.workerKey);
                affectedTasks.push(...shiftedTasks);
            }
        });

        return affectedTasks;
    }

    private shortenTask(
        assignments: WorkerTask[],
        task: Task,
        reduceHours: number,
        currentTimeMs: number
    ): void {
        let remainingMs = reduceHours * 60 * 60 * 1000;
        const taskAssigns = assignments
            .filter(a => a.taskId === task.taskId)
            .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

        for (const assign of taskAssigns) {
            if (remainingMs <= 0) break;
            const start = new Date(assign.startDate).getTime();
            const end = new Date(assign.endDate).getTime();
            const minEnd = Math.max(start, currentTimeMs);
            if (end <= minEnd) continue;

            const reducible = end - minEnd;
            if (remainingMs >= reducible) {
                assign.endDate = new Date(minEnd).toISOString();
                remainingMs -= reducible;
            } else {
                const newEnd = new Date(end - remainingMs).toISOString();
                assign.endDate = newEnd;
                remainingMs = 0;
            }
        }
    }

    private shiftTask(
        assignments: WorkerTask[],
        taskId: string,
        shiftMs: number
    ): string[] {
        const affectedTasks: string[] = [];
        const workers = new Set<string>();

        assignments.forEach(a => {
            if (a.taskId !== taskId) return;
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();
            a.startDate = new Date(start + shiftMs).toISOString();
            a.endDate = new Date(end + shiftMs).toISOString();
            if (a.workerId) workers.add(a.workerId);
        });

        workers.forEach(workerId => {
            affectedTasks.push(...this.pushWorkerSchedule(assignments, workerId));
        });

        return affectedTasks;
    }

    private pushWorkerSchedule(assignments: WorkerTask[], workerId: string): string[] {
        const workerAssigns = assignments
            .filter(a => a.workerId === workerId)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        const affectedTasks: string[] = [];
        let prevEnd = 0;
        workerAssigns.forEach(a => {
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();
            if (prevEnd > 0 && start < prevEnd) {
                const shift = prevEnd - start;
                a.startDate = new Date(start + shift).toISOString();
                a.endDate = new Date(end + shift).toISOString();
                if (a.taskId) affectedTasks.push(a.taskId);
            }
            prevEnd = new Date(a.endDate).getTime();
        });

        return affectedTasks;
    }

    private getTaskStartHelper(items: WorkerTask[]): Map<string, number> {
        const map = new Map<string, number>();
        items.forEach(i => {
            if (!i.taskId) return;
            const s = new Date(i.startDate).getTime();
            const current = map.get(i.taskId);
            if (!current || s < current) {
                map.set(i.taskId, s);
            }
        });
        return map;
    }

    private enforceNoEarlyFinish(
        newAssignments: WorkerTask[],
        originalAssignments: WorkerTask[],
        updatedTaskIds: Set<string>
    ): WorkerTask[] {
        const adjusted = newAssignments.map(a => ({ ...a }));
        const origEnds = this.getTaskEndHelper(originalAssignments);
        const newEnds = this.getTaskEndHelper(adjusted);

        // Shift tasks that finish earlier than original (for non-updated tasks)
        newEnds.forEach((newEnd, taskId) => {
            if (updatedTaskIds.has(taskId)) return;
            const origEnd = origEnds.get(taskId);
            if (origEnd && newEnd < origEnd) {
                const shiftMs = origEnd - newEnd;
                adjusted.forEach(a => {
                    if (a.taskId !== taskId) return;
                    const start = new Date(a.startDate).getTime();
                    const end = new Date(a.endDate).getTime();
                    a.startDate = new Date(start + shiftMs).toISOString();
                    a.endDate = new Date(end + shiftMs).toISOString();
                });
            }
        });

        // Resolve overlaps per worker by pushing forward
        const byWorker = new Map<string, WorkerTask[]>();
        adjusted.forEach(a => {
            if (!a.workerId) return;
            const list = byWorker.get(a.workerId) || [];
            list.push(a);
            byWorker.set(a.workerId, list);
        });

        byWorker.forEach(list => {
            list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            let prevEnd = 0;
            list.forEach(a => {
                const start = new Date(a.startDate).getTime();
                const end = new Date(a.endDate).getTime();
                if (prevEnd > 0 && start < prevEnd) {
                    const shift = prevEnd - start;
                    a.startDate = new Date(start + shift).toISOString();
                    a.endDate = new Date(end + shift).toISOString();
                }
                prevEnd = new Date(a.endDate).getTime();
            });
        });

        return adjusted;
    }

    private getTaskEndHelper(items: WorkerTask[]): Map<string, number> {
        const map = new Map<string, number>();
        items.forEach(i => {
            if (!i.taskId) return;
            const e = new Date(i.endDate).getTime();
            const c = map.get(i.taskId) || 0;
            if (e > c) map.set(i.taskId, e);
        });
        return map;
    }
}
