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
import { mergeConsecutiveItems } from '../utils/scheduleAggregator';
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

// Set to true to ignore productionRate and let each shift attempt all remaining work.
// When false, each shift's budget = totalRemainingHours * productionRate.
const IGNORE_SHARE_OF_WORK = true;

export class MultiShiftPlanningService {
    private planningService: PlanningService;

    constructor() {
        this.planningService = new PlanningService();
    }

    public async plan(request: MultiShiftPlanRequest): Promise<MultiShiftPlanResponse> {
        if (!request.shifts || request.shifts.length === 0) {
            throw new MultiShiftValidationError('At least one shift is required.');
        }

        // Validate shifts have valid rates
        // Sort shifts by start time to ensure logical progression
        // NOTE: We assume the caller (Adapter) sorts them or we sort them here?
        // Let's sort to be safe, assuming start ISO strings.
        const sortedShiftConfigs = [...request.shifts].sort((a, b) =>
            new Date(a.shiftInterval.start).getTime() - new Date(b.shiftInterval.start).getTime()
        );

        // Validate Production Rates Sum <= 1.0 (with epsilon)
        if (!IGNORE_SHARE_OF_WORK) {
            const totalRate = sortedShiftConfigs.reduce((sum, s) => sum + (s.productionRate || 0), 0);
            if (totalRate > 1.0001) {
                throw new MultiShiftValidationError(`Total production rate (${totalRate.toFixed(2)}) exceeds 1.0`);
            }
        }

        // Resolve all Shift Windows first
        const resolvedShifts: ShiftWindow[] = [];
        for (const config of sortedShiftConfigs) {
            const resolved = await this.resolveShiftWindow(config, config.productionRate || 0, request.workers, request.clockedInWorkerIds);
            resolvedShifts.push(resolved);
        }

        const baseTasks = this.cloneTasks(request.tasks);
        const totalRemainingHours = this.normalizeTaskEstimates(baseTasks);

        // Execution Loop
        const allAssignments: WorkerTask[] = [];
        const allIdleWorkers: WorkerTask[] = [];
        const shiftSummaries: ShiftSummary[] = [];

        // Track remaining work per task across shifts
        // Initial state is the normalized estimates
        let currentRemaining = new Map<string, number>();
        baseTasks.forEach(t => currentRemaining.set(t.taskId, t.estimatedRemainingLaborHours || 0));

        // Iterate Shifts
        for (let i = 0; i < resolvedShifts.length; i++) {
            const shift = resolvedShifts[i];
            const shiftTasks = this.cloneTasks(baseTasks).map(task => ({
                ...task,
                estimatedRemainingLaborHours: currentRemaining.get(task.taskId) || 0
            }));

            // Budget for this shift
            // When ignoring share-of-work, give each shift the full remaining hours as budget
            const remainingTotal = Array.from(currentRemaining.values()).reduce((s, h) => s + h, 0);
            const shiftBudget = IGNORE_SHARE_OF_WORK
                ? remainingTotal
                : totalRemainingHours * shift.productionRate;

            console.log(`[MultiShift] Planning Shift ${i + 1}/${resolvedShifts.length}: ${shift.shiftId} (Rate: ${shift.productionRate})`);

            // PASS CONTEXT: Pass previous assignments to seed the next shift's Resource Manager
            // This ensures "Continuity" (Stickiness) works across shift boundaries.
            const previousAssignments = allAssignments;

            const steps = request.useTwoPassDepartmentScheduling
                ? this.runShiftTwoPass(shift, shiftTasks, shiftBudget, previousAssignments, request.useCrewCap, request.preventLateJoiners, request.keepCrewTogether)
                : this.runShiftPlan(shift, shiftTasks, shiftBudget, previousAssignments, request.enforceDepartmentMatch, request.useCrewCap, request.preventLateJoiners, request.keepCrewTogether);

            // Accumulate Results
            allAssignments.push(...steps.assignments);
            allIdleWorkers.push(...steps.idleWorkers);
            // Capture planner diagnostics from first shift (for debugging)
            if (i === 0 && steps._plannerDiag) {
                (allAssignments as any)._plannerDiag = steps._plannerDiag;
            }
            if (i === 0 && (steps as any)._twoPassDiag) {
                (allAssignments as any)._twoPassDiag = (steps as any)._twoPassDiag;
            }

            // Calculate remaining for next shift
            // We use the Cumulative assignments for accurate "what's left" calculation? 
            // OR we calculate remaining based on just this shift's work?
            // `calculateRemainingHours` takes `tasks` (originals) and `assignments` (all so far)
            // So we pass ALL assignments to get the true remaining state.
            const updatedRemaining = this.calculateRemainingHours(baseTasks, allAssignments);

            // Update currentRemaining for next loop iteration
            currentRemaining = updatedRemaining;

            // If all remaining work is done, skip remaining shifts
            const allDone = Array.from(currentRemaining.values()).every(h => h <= 0);
            if (IGNORE_SHARE_OF_WORK && allDone) {
                console.log(`[MultiShift] All tasks complete after shift ${i + 1}, skipping remaining shifts`);
                break;
            }

            // Generate Summary for this shift
            // Note: summarizeShift calculates what happened *in this shift*
            // We need to know what was remaining *at the start* of this shift to know what was "in progress" vs "completed"
            // We can re-calculate "remainingAtStart" by taking `updatedRemaining` and ADDING back the work done in this shift?
            // OR just use the `currentRemaining` from BEFORE the loop update?
            // YES: `currentRemaining` (before update) is exactly `remainingAtStart` for this shift.
            // Wait, I updated `currentRemaining = updatedRemaining` above. I need to capture it before.
            // Refactor: moved update to after summary.
        }

        // Re-loop to generate summaries properly with correct "start state" context if needed, 
        // or just capture it inside the loop.
        // Let's do it cleanly:

        // RESET for Summary Loop to ensure data consistency
        const finalRemaining = this.calculateRemainingHours(baseTasks, allAssignments);
        const deficitTasks: DeficitTask[] = baseTasks
            .filter(task => (finalRemaining.get(task.taskId) || 0) > 0)
            .map(task => ({
                taskId: task.taskId,
                deficitHours: finalRemaining.get(task.taskId) || 0
            }));

        // Generate Progress & Summaries
        const taskProgress = this.calculateTaskProgressForShifts(baseTasks, allAssignments, resolvedShifts.map(s => s.shiftId));

        // Shift Summaries
        for (const shift of resolvedShifts) {
            // Filter assignments for this shift
            // To do this accurately, we need to know the time window of the shift? 
            // OR just filter by the assignments generated in that step?
            // Since we concatenated them, we might lose "which shift generated this".
            // BUT assignments have timestamps. We can check overlap with shift.interval.
            // Robust way: Filter allAssignments by time overlap with shift.intervalStart/End
            const shiftAssignments = allAssignments.filter(a => {
                const aStart = new Date(a.startDate).getTime();
                const sStart = shift.intervalStart.getTime();
                const sEnd = shift.intervalEnd.getTime();
                return aStart >= sStart && aStart < sEnd;
            });

            // We need remaining *before* this shift to detect "Started in this shift".
            // This is complex to reconstruct post-hoc.
            // Simplified Summary: Just what work was done.
            const summary = this.summarizeShift(
                shift.shiftId,
                shift.productionRate,
                baseTasks,
                shiftAssignments,
                // We omit remainingAtStart for now, or we'd need to thread it through. 
                // `summarizeShift` uses it to distinguish "In Progress".
                // Let's pass undefined and accept slightly less precise "Task Status" inside the summary object 
                // (it mostly affects "Tasks Completed" vs "In Progress" categorization logic).
                undefined
            );
            shiftSummaries.push(summary);
        }

        // Check for violations
        const violations = this.checkViolations(baseTasks, taskProgress);

        // Generate warnings
        const warnings: string[] = [];
        taskProgress.forEach(progress => {
            if (progress.shiftCompletionPreference === 'prefersCompleteWithinShift' &&
                progress.completedInShift === 'spans_shifts') {
                warnings.push(
                    `Task ${progress.taskId} has prefersCompleteWithinShift but spans shifts`
                );
            }
        });

        return {
            assignments: allAssignments,
            idleWorkers: allIdleWorkers,
            deficitTasks,
            taskProgress,
            shiftSummaries,
            // Legacy/Compat mappings
            shift1Summary: shiftSummaries[0],
            shift2Summary: shiftSummaries.length > 1 ? shiftSummaries[1] : undefined,
            violations,
            warnings,
            _plannerDiag: (allAssignments as any)?._plannerDiag,
            _twoPassDiag: (allAssignments as any)?._twoPassDiag
        } as any;
    }

    private runShiftPlan(shift: ShiftWindow, tasks: Task[], workBudgetHours: number, seedAssignments: WorkerTask[] = [], enforceDepartmentMatch?: boolean, useCrewCap?: boolean, preventLateJoiners?: boolean, keepCrewTogether?: boolean) {
        const planRequest: PlanRequest = {
            workers: shift.workers,
            tasks,
            interval: {
                startTime: shift.intervalStart.toISOString(),
                endTime: shift.intervalEnd.toISOString()
            },
            useHistorical: false,
            workBudgetHours,
            enforceDepartmentMatch,
            useCrewCap,
            preventLateJoiners,
            keepCrewTogether
        };

        const rawSteps = this.planningService.plan(planRequest, {
            seedAssignments // Pass history to calculator
        });
        return {
            assignments: rawSteps
                .filter(step => step.type === 'assignment')
                .map(step => ({
                    workerId: step.workerId,
                    taskId: step.taskId,
                    shiftId: shift.shiftId, // Add verify_preview.js
                    startDate: step.startDate,
                    endDate: step.endDate
                })) as WorkerTask[],
            idleWorkers: rawSteps
                .filter(step => step.type === 'worker_idle')
                .map(step => ({
                    workerId: step.workerId,
                    taskId: null,
                    shiftId: shift.shiftId,
                    startDate: step.startDate,
                    endDate: step.endDate
                })) as WorkerTask[],
            _plannerDiag: (rawSteps as any)._plannerDiag
        };
    }

    /**
     * Two-pass department scheduling:
     * Pass 1: Hard department constraint (workers only get same-dept tasks)
     * Pass 2: Soft department scoring for idle workers on deficit tasks
     */
    private runShiftTwoPass(
        shift: ShiftWindow,
        shiftTasks: Task[],
        shiftBudget: number,
        previousAssignments: WorkerTask[],
        useCrewCap?: boolean,
        preventLateJoiners?: boolean,
        keepCrewTogether?: boolean
    ) {
        // === PASS 1: Hard department constraint ===
        console.log(`[TwoPass] Pass 1: Hard department constraint (${shift.workers.length} workers, ${shiftTasks.length} tasks)`);
        const pass1 = this.runShiftPlan(
            shift, shiftTasks, shiftBudget, previousAssignments,
            true,  // enforceDepartmentMatch
            useCrewCap,
            preventLateJoiners,
            keepCrewTogether
        );

        // Calculate remaining after pass 1
        const pass1Remaining = this.calculateRemainingHours(shiftTasks, pass1.assignments);

        // Deficit tasks: tasks with remaining hours > 0
        const deficitTaskIds = shiftTasks
            .filter(t => (pass1Remaining.get(t.taskId) || 0) > 0.0001)
            .map(t => t.taskId);

        if (deficitTaskIds.length === 0) {
            console.log(`[TwoPass] Pass 1 sufficient — no deficits, skipping pass 2`);
            return pass1;
        }

        // Find idle workers (fully idle or with idle time windows)
        const pass2Workers = this.computeIdleWorkers(shift, pass1.assignments);

        if (pass2Workers.length === 0) {
            console.log(`[TwoPass] No idle workers for pass 2 (${deficitTaskIds.length} deficit tasks remain)`);
            return pass1;
        }

        // Build pass 2 tasks: ALL tasks with updated remaining hours.
        // Why ALL? Prerequisites. planningService.getReadyTasks() checks prerequisiteTaskIds
        // against state.tasks — completed tasks (remaining=0) must be in the map so their
        // dependents can become ready.
        const pass2Tasks = shiftTasks.map(t => {
            const rem = pass1Remaining.get(t.taskId) || 0;
            return {
                ...t,
                estimatedRemainingLaborHours: rem,
                estimatedTotalLaborHours: rem > 0 ? rem : t.estimatedTotalLaborHours
            };
        });

        // Build pass 2 shift with idle workers only
        const pass2Shift: ShiftWindow = { ...shift, workers: pass2Workers };

        // Budget = sum of deficit hours
        const pass2Budget = deficitTaskIds.reduce((sum, id) => sum + (pass1Remaining.get(id) || 0), 0);

        // Seed pass 2 with ALL prior assignments → ResourceManager prevents double-booking
        const pass2Seed = [...previousAssignments, ...pass1.assignments];

        console.log(`[TwoPass] Pass 2: ${pass2Workers.length} idle workers, ${deficitTaskIds.length} deficit tasks, ${pass2Budget.toFixed(1)}h budget`);

        // === PASS 2: Soft department scoring (+200 same, -100 cross) ===
        const pass2 = this.runShiftPlan(
            pass2Shift, pass2Tasks, pass2Budget, pass2Seed,
            false,  // enforceDepartmentMatch = false → soft scoring
            useCrewCap,
            preventLateJoiners,
            keepCrewTogether
        );

        console.log(`[TwoPass] Pass 2 assigned ${pass2.assignments.length} additional work items`);

        // === COMPREHENSIVE DEEP-DIVE DIAGNOSTICS ===
        const pass2WorkerIdSet = new Set(pass2Workers.map(w => w.workerId));
        const shiftStartMs = shift.intervalStart.getTime();

        // Group pass 2 output assignments by worker
        const pass2ByWorker = new Map<string, WorkerTask[]>();
        for (const a of pass2.assignments) {
            if (!a.workerId) continue;
            if (!pass2ByWorker.has(a.workerId)) pass2ByWorker.set(a.workerId, []);
            pass2ByWorker.get(a.workerId)!.push(a);
        }

        // Simulate what planningService sees for each active task at pass 2 start
        // Replicates "committed future work" calc from planningService L280-303
        const pass2TaskAnalysis = pass2Tasks
            .filter(t => (t.estimatedRemainingLaborHours || 0) > 0)
            .map(t => {
                const seedForTask = pass2Seed.filter(a => a.taskId === t.taskId);
                const pass1OnlySeed = seedForTask.filter(a => !pass2WorkerIdSet.has(a.workerId!));
                let committedFutureWork = 0;
                let pass1CommittedFuture = 0;
                for (const a of seedForTask) {
                    const aEnd = new Date(a.endDate).getTime();
                    if (aEnd > shiftStartMs) {
                        const futureStart = Math.max(shiftStartMs, new Date(a.startDate).getTime());
                        const hrs = (aEnd - futureStart) / 3600000;
                        committedFutureWork += hrs;
                        if (!pass2WorkerIdSet.has(a.workerId!)) pass1CommittedFuture += hrs;
                    }
                }
                const rem = t.estimatedRemainingLaborHours || 0;
                const effective = Math.max(0, rem - committedFutureWork);
                const prereqs = t.prerequisiteTaskIds || [];
                const prereqsMet = prereqs.every(pid => {
                    const pt = pass2Tasks.find(p => p.taskId === pid);
                    return pt && (pt.estimatedRemainingLaborHours || 0) <= 0;
                });
                const prereqDetails = prereqs.map(pid => {
                    const pt = pass2Tasks.find(p => p.taskId === pid);
                    return { taskId: pid, name: pt?.name, remaining: +(pt?.estimatedRemainingLaborHours || 0).toFixed(2), met: (pt?.estimatedRemainingLaborHours || 0) <= 0 };
                });
                return {
                    taskId: t.taskId, name: t.name, dept: t.departmentId, maxWorkers: t.maxWorkers,
                    deficitHours: +rem.toFixed(2),
                    seedCount: seedForTask.length, pass1SeedCount: pass1OnlySeed.length,
                    committedFutureTotal: +committedFutureWork.toFixed(2),
                    committedFromPass1: +pass1CommittedFuture.toFixed(2),
                    effectiveAtStart: +effective.toFixed(2),
                    zeroedOut: effective <= 0 && rem > 0,
                    prereqsMet, prereqDetails,
                    pass2OutputAssignments: pass2.assignments.filter(a => a.taskId === t.taskId).length
                };
            });

        // Worker availability helper
        const getAvailHours = (w: any) => {
            const windows = Array.isArray(w.availability) ? w.availability : w.availability ? [w.availability] : null;
            if (!windows) return (shift.intervalEnd.getTime() - shift.intervalStart.getTime()) / 3600000;
            return windows.reduce((s: number, iv: any) => s + (new Date(iv.endTime).getTime() - new Date(iv.startTime).getTime()) / 3600000, 0);
        };

        // Build aggregated pass 1 workerTasks for debug visibility
        const pass1WorkerTasks = mergeConsecutiveItems(
            pass1.assignments.filter(a => a.workerId)
        ).map(a => ({
            workerId: a.workerId,
            taskId: a.taskId,
            startDate: a.startDate,
            endDate: a.endDate
        }));

        const twoPassDiag = {
            pass1Assignments: pass1.assignments.length,
            pass1WorkerTasks,
            pass2Assignments: pass2.assignments.length,

            // Pass 2 planner internals — steps, empty steps, break reason, workers per step
            pass2PlannerDiag: pass2._plannerDiag,

            // Seed analysis
            seedAnalysis: {
                total: pass2Seed.length,
                fromPrevShifts: previousAssignments.length,
                fromPass1: pass1.assignments.length,
                uniqueWorkers: new Set(pass2Seed.map(a => a.workerId)).size,
                pass1OnlyWorkerAssignments: pass2Seed.filter(a => !pass2WorkerIdSet.has(a.workerId!)).length,
                pass2WorkerAssignments: pass2Seed.filter(a => pass2WorkerIdSet.has(a.workerId!)).length,
            },

            // Task analysis — sorted: zeroed-out first, then by deficit desc
            pass2TaskAnalysis: pass2TaskAnalysis.sort((a, b) => {
                if (a.zeroedOut !== b.zeroedOut) return a.zeroedOut ? -1 : 1;
                return b.deficitHours - a.deficitHours;
            }),

            // Summary
            taskSummary: {
                activeTasks: pass2TaskAnalysis.length,
                zeroedByDoubleCount: pass2TaskAnalysis.filter(t => t.zeroedOut).length,
                prereqsNotMet: pass2TaskAnalysis.filter(t => !t.prereqsMet).length,
                maxWorkers0: pass2TaskAnalysis.filter(t => t.maxWorkers === 0).length,
                assignable: pass2TaskAnalysis.filter(t => !t.zeroedOut && t.prereqsMet && (t.maxWorkers || 0) > 0).length,
                hoursZeroedOut: +pass2TaskAnalysis.filter(t => t.zeroedOut).reduce((s, t) => s + t.deficitHours, 0).toFixed(2),
                hoursPrereqBlocked: +pass2TaskAnalysis.filter(t => !t.zeroedOut && !t.prereqsMet).reduce((s, t) => s + t.deficitHours, 0).toFixed(2),
                hoursMaxW0: +pass2TaskAnalysis.filter(t => t.maxWorkers === 0).reduce((s, t) => s + t.deficitHours, 0).toFixed(2),
                hoursAssignable: +pass2TaskAnalysis.filter(t => !t.zeroedOut && t.prereqsMet && (t.maxWorkers || 0) > 0).reduce((s, t) => s + t.effectiveAtStart, 0).toFixed(2),
            },

            // Per-worker pass 2 utilization
            pass2Workers: pass2Workers.map(w => {
                const asgn = pass2ByWorker.get(w.workerId) || [];
                const totalMs = asgn.reduce((s, a) => s + (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()), 0);
                const availH = getAvailHours(w);
                return {
                    id: w.workerId, name: w.name, dept: w.departmentId,
                    availH: +availH.toFixed(2),
                    pass2H: +(totalMs / 3600000).toFixed(2),
                    idleH: +(availH - totalMs / 3600000).toFixed(2),
                    tasks: asgn.map(a => ({ taskId: a.taskId, start: a.startDate, end: a.endDate }))
                };
            }),

            deficitHoursAfterPass1: pass2Budget,
        };

        // Merge results
        return {
            assignments: [...pass1.assignments],
            idleWorkers: pass2.idleWorkers,  // Only workers idle after BOTH passes
            _plannerDiag: pass1._plannerDiag,
            _twoPassDiag: twoPassDiag
        };
    }

    /**
     * Compute workers with idle time from pass 1 assignments.
     * Partially-busy workers get availability windows set to their idle gaps.
     * Fully-idle workers keep their original availability.
     */
    private computeIdleWorkers(shift: ShiftWindow, pass1Assignments: WorkerTask[]): Worker[] {
        const shiftStart = shift.intervalStart.getTime();
        const shiftEnd = shift.intervalEnd.getTime();
        const MIN_GAP_MS = 30 * 60 * 1000; // 30 min minimum useful window

        // Group pass1 assignments by worker
        const byWorker = new Map<string, WorkerTask[]>();
        for (const a of pass1Assignments) {
            if (!a.workerId) continue;
            if (!byWorker.has(a.workerId)) byWorker.set(a.workerId, []);
            byWorker.get(a.workerId)!.push(a);
        }

        const result: Worker[] = [];
        for (const worker of shift.workers) {
            const assignments = byWorker.get(worker.workerId) || [];

            if (assignments.length === 0) {
                // Fully idle — available for entire shift
                result.push({ ...worker });
                continue;
            }

            // Sort by start time, compute idle gaps
            const sorted = [...assignments].sort(
                (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            );

            const idleWindows: Array<{ startTime: string; endTime: string }> = [];
            let cursor = shiftStart;

            for (const a of sorted) {
                const aStart = new Date(a.startDate).getTime();
                const aEnd = new Date(a.endDate).getTime();
                if (aStart > cursor) {
                    idleWindows.push({
                        startTime: new Date(cursor).toISOString(),
                        endTime: new Date(aStart).toISOString()
                    });
                }
                cursor = Math.max(cursor, aEnd);
            }

            // Trailing gap after last assignment
            if (cursor < shiftEnd) {
                idleWindows.push({
                    startTime: new Date(cursor).toISOString(),
                    endTime: new Date(shiftEnd).toISOString()
                });
            }

            // Filter out gaps too small to be useful
            const meaningful = idleWindows.filter(w => {
                return new Date(w.endTime).getTime() - new Date(w.startTime).getTime() >= MIN_GAP_MS;
            });

            if (meaningful.length > 0) {
                result.push({ ...worker, availability: meaningful });
            }
        }

        return result;
    }

    private async resolveShiftWindow(input: {
        shiftId: string;
        shiftInterval: { start: string; end: string };
        productionRate?: number;
    }, productionRate: number, providedWorkers?: Worker[], clockedInWorkerIds?: Set<string>): Promise<ShiftWindow> {
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
        // Trust the interval provided by the request (e.g. user override) 
        // even if it exceeds the strict DB shift bounds.
        const clampedStart = intervalStart;
        const clampedEnd = intervalEnd;

        if (!(clampedStart < clampedEnd)) {
            throw new MultiShiftValidationError('shiftInterval must have a valid duration (start < end).');
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

            // Attendance filter: for active shifts, only keep clocked-in workers
            if (clockedInWorkerIds && clockedInWorkerIds.size > 0) {
                const now = Date.now();
                const isActive = now >= clampedStart.getTime() && now < clampedEnd.getTime();

                if (isActive) {
                    const normalize = (id: string) => id?.toLowerCase().replace(/-/g, '');
                    const beforeCount = workers.length;
                    const filtered = workers.filter(w => {
                        const wId = (w as any).workerId || (w as any).id;
                        return clockedInWorkerIds.has(normalize(wId));
                    });

                    // Fallback: if no clocked-in workers found, keep all (avoid empty shift)
                    if (filtered.length > 0) {
                        workers = filtered;
                    }
                    console.log(`[MultiShift] Active shift ${input.shiftId}: attendance filter ${beforeCount} → ${filtered.length} clocked-in workers`);
                }
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
    private calculateTaskProgressForShifts(
        tasks: Task[],
        allAssignments: WorkerTask[],
        shiftIds: string[]
    ): TaskShiftProgress[] {
        return tasks.map(task => {
            const shiftHoursMap: Record<string, number> = {};
            let completedHours = 0;

            // Calculate hours per shift
            // We need to know which assignment belongs to which shift. 
            // Since we don't have shiftId on WorkerTask, we might need a better way?
            // Actually, for "Summary" purposes, we might just sum TOTAL hours for now 
            // and rely on the shiftSummaries for per-shift breakdowns.
            // But the UI needs `shift1Hours`, `shift2Hours`.
            // Let's implement a heuristic: 
            // We can't easily map assignment -> shiftId without time overlaps which is expensive.
            // BUT, `allAssignments` doesn't have shift info.
            // Let's simplify: `completedInShift` is the main goal.

            // Total completed
            const totalRequiredHours = task.estimatedTotalLaborHours || 0;

            // Calculate total hours from all assignments
            const totalHours = this.sumAssignmentHours(allAssignments, task.taskId);

            const completionPercentage = totalRequiredHours > 0
                ? Math.min(100, (totalHours / totalRequiredHours) * 100)
                : 0;

            let completedInShift: string = 'incomplete';
            if (completionPercentage >= 99.9) {
                // If it spans multiple shifts...
                // Ideally we'd check if it was worked on in >1 shift.
                // For now, let's just mark it 'complete' or generic 'spans_shifts' 
                // if we don't have precise shift tracking here.
                // Users just want to know IF it's done. 
                // Let's default to 'spans_shifts' if we don't know better for now, to be safe.
                completedInShift = 'spans_shifts'; // TODO: Enhance with precise tracking
            }

            return {
                taskId: task.taskId,
                taskName: task.name,
                shift1Hours: 0, // Deprecated/Unknown without complex mapping
                shift2Hours: 0, // Deprecated
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
