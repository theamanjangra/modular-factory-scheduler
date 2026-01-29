/**
 * KAN-383: Skill-Based Worker-Task Matching Service
 *
 * This service implements a one-time skill-based matching algorithm for
 * assigning workers to tasks based on required skills. Unlike the planning
 * algorithm which uses soft preferences over time blocks, this enforces
 * HARD skill requirements - workers must have ALL required skills to qualify.
 *
 * Algorithm Overview:
 * 1. Build Eligibility Matrix - Find workers with ALL required skills per task
 * 2. Score by Proficiency - Lower skill ranking = better match
 * 3. Greedy Assignment - Process tasks by priority, assign best workers
 * 4. Collect Results - Assignments, idle workers, deficit tasks, stats
 *
 * @module services/skillMatchingService
 */

import {
    SkillMatchingRequest,
    SkillMatchingResponse,
    MatchableTask,
    MatchableWorker,
    SkillMatchAssignment,
    IdleWorkerResult,
    DeficitTaskResult,
    MatchingStats
} from '../types';

/**
 * Internal representation of a worker with computed eligibility data
 */
interface EligibleWorker {
    worker: MatchableWorker;
    skillScore: number;
    matchedSkills: string[];
}

/**
 * Internal task processing state
 */
interface TaskProcessingResult {
    task: MatchableTask;
    assignedWorkers: EligibleWorker[];
    isFullyStaffed: boolean;
    isPartiallyStaffed: boolean;
    deficit: number;
}

export class SkillMatchingService {
    private readonly DEFAULT_RANKING = 999;  // Penalty for missing skill ranking

    /**
     * Main entry point: Match workers to tasks based on skill requirements.
     *
     * @param request - Tasks and workers to match
     * @returns Assignments, idle workers, deficit tasks, and statistics
     */
    public match(request: SkillMatchingRequest): SkillMatchingResponse {
        const { tasks, workers } = this.validateAndNormalize(request);

        // Track which workers have been assigned
        const assignedWorkerIds = new Set<string>();

        // Results accumulators
        const assignments: SkillMatchAssignment[] = [];
        const deficitTasks: DeficitTaskResult[] = [];
        const taskResults: TaskProcessingResult[] = [];

        // Sort tasks by priority (lower = higher priority), then by scarcity
        const sortedTasks = this.sortTasksByPriority(tasks, workers);

        // Process each task
        for (const task of sortedTasks) {
            const result = this.processTask(task, workers, assignedWorkerIds, request.enforceDepartmentMatch);
            taskResults.push(result);

            // Record assignments
            for (const eligible of result.assignedWorkers) {
                assignedWorkerIds.add(eligible.worker.workerId);
                assignments.push({
                    workerId: eligible.worker.workerId,
                    workerName: eligible.worker.name,
                    taskId: task.taskId,
                    taskName: task.name,
                    skillScore: eligible.skillScore,
                    matchedSkills: eligible.matchedSkills
                });
            }

            // Record deficit if applicable
            if (result.deficit > 0) {
                deficitTasks.push({
                    taskId: task.taskId,
                    taskName: task.name,
                    requiredSkills: task.requiredSkills,
                    minWorkersNeeded: task.minWorkers ?? 1,
                    workersAssigned: result.assignedWorkers.length,
                    deficit: result.deficit,
                    estimatedLaborHours: task.estimatedLaborHours
                });
            }
        }

        // Determine idle workers and their reasons
        const idleWorkers = this.determineIdleWorkers(workers, assignedWorkerIds, tasks);

        // Calculate statistics
        const stats = this.calculateStats(taskResults, assignments, workers, idleWorkers);

        return {
            assignments,
            idleWorkers,
            deficitTasks,
            stats
        };
    }

    /**
     * Validate input and normalize data (fill defaults, dedupe)
     */
    private validateAndNormalize(request: SkillMatchingRequest): SkillMatchingRequest {
        if (!request.tasks || !Array.isArray(request.tasks)) {
            return { tasks: [], workers: request.workers || [] };
        }
        if (!request.workers || !Array.isArray(request.workers)) {
            return { tasks: request.tasks, workers: [] };
        }

        // Deduplicate workers by ID (keep first occurrence)
        const seenWorkerIds = new Set<string>();
        const uniqueWorkers = request.workers.filter(w => {
            if (!w.workerId || seenWorkerIds.has(w.workerId)) return false;
            seenWorkerIds.add(w.workerId);
            return true;
        });

        // Normalize tasks (ensure defaults)
        const normalizedTasks = request.tasks.map(t => ({
            ...t,
            requiredSkills: t.requiredSkills || [],
            minWorkers: Math.max(1, t.minWorkers ?? 1),
            maxWorkers: Math.max(t.minWorkers ?? 1, t.maxWorkers ?? 1),
            priority: t.priority ?? 999
        }));

        // Normalize workers (ensure skills object exists)
        const normalizedWorkers = uniqueWorkers.map(w => ({
            ...w,
            skills: w.skills || {}
        }));

        return { tasks: normalizedTasks, workers: normalizedWorkers };
    }

    /**
     * Sort tasks for optimal assignment order:
     * 1. By priority (lower = higher priority)
     * 2. By scarcity (fewer eligible workers = process first to avoid starvation)
     * 3. By labor hours (larger tasks first as tiebreaker)
     */
    private sortTasksByPriority(tasks: MatchableTask[], workers: MatchableWorker[]): MatchableTask[] {
        // Pre-compute eligible worker counts for scarcity sorting
        const eligibilityCounts = new Map<string, number>();
        for (const task of tasks) {
            const count = workers.filter(w => this.hasAllRequiredSkills(w, task.requiredSkills)).length;
            eligibilityCounts.set(task.taskId, count);
        }

        return [...tasks].sort((a, b) => {
            // Primary: Priority (lower first)
            const priorityDiff = (a.priority ?? 999) - (b.priority ?? 999);
            if (priorityDiff !== 0) return priorityDiff;

            // Secondary: Scarcity - fewer eligible workers = higher priority
            const countA = eligibilityCounts.get(a.taskId) ?? 0;
            const countB = eligibilityCounts.get(b.taskId) ?? 0;
            if (countA !== countB) return countA - countB;

            // Tertiary: Labor hours (larger tasks first)
            return (b.estimatedLaborHours ?? 0) - (a.estimatedLaborHours ?? 0);
        });
    }

    /**
     * Process a single task: find eligible workers and assign the best ones
     */
    private processTask(
        task: MatchableTask,
        allWorkers: MatchableWorker[],
        assignedWorkerIds: Set<string>,
        enforceDepartmentMatch: boolean = false
    ): TaskProcessingResult {
        const minWorkers = task.minWorkers ?? 1;
        const maxWorkers = task.maxWorkers ?? 1;

        // Find eligible unassigned workers
        const eligibleWorkers = allWorkers
            .filter(w => !assignedWorkerIds.has(w.workerId))
            .filter(w => {
                // 1. Department Check (if enforced)
                if (enforceDepartmentMatch && task.departmentId && w.departmentId) {
                    // Normalizing for safety
                    if (task.departmentId.trim().toLowerCase() !== w.departmentId.trim().toLowerCase()) {
                        return false;
                    }
                }
                // 2. Skill Check
                return this.hasAllRequiredSkills(w, task.requiredSkills);
            })
            .map(w => ({
                worker: w,
                skillScore: this.calculateSkillScore(w, task.requiredSkills),
                matchedSkills: task.requiredSkills
            }))
            .sort((a, b) => a.skillScore - b.skillScore); // Lower score = better match

        // Assign up to maxWorkers
        const assignedWorkers = eligibleWorkers.slice(0, maxWorkers);
        const assignedCount = assignedWorkers.length;

        return {
            task,
            assignedWorkers,
            isFullyStaffed: assignedCount >= minWorkers,
            isPartiallyStaffed: assignedCount > 0 && assignedCount < minWorkers,
            deficit: Math.max(0, minWorkers - assignedCount)
        };
    }

    /**
     * Check if worker has ALL required skills.
     * This is a HARD constraint - partial matches don't qualify.
     */
    private hasAllRequiredSkills(worker: MatchableWorker, requiredSkills: string[]): boolean {
        if (requiredSkills.length === 0) return true;  // No requirements = everyone qualifies
        return requiredSkills.every(skill => worker.skills[skill] !== undefined);
    }

    /**
     * Calculate skill score for a worker on a task.
     * Lower score = better match (sum of skill rankings).
     *
     * Example:
     *   Task requires [A, K]
     *   Worker has A=1, K=3 → Score: 4
     *   Worker has A=2, K=1 → Score: 3 (better)
     */
    private calculateSkillScore(worker: MatchableWorker, requiredSkills: string[]): number {
        if (requiredSkills.length === 0) return 0;
        return requiredSkills.reduce(
            (sum, skill) => sum + (worker.skills[skill] ?? this.DEFAULT_RANKING),
            0
        );
    }

    /**
     * Determine why each unassigned worker is idle
     */
    private determineIdleWorkers(
        allWorkers: MatchableWorker[],
        assignedWorkerIds: Set<string>,
        tasks: MatchableTask[]
    ): IdleWorkerResult[] {
        const idleWorkers: IdleWorkerResult[] = [];

        for (const worker of allWorkers) {
            if (assignedWorkerIds.has(worker.workerId)) continue;

            const availableSkills = Object.keys(worker.skills);
            let reason: IdleWorkerResult['reason'];

            if (tasks.length === 0) {
                reason = 'no_tasks';
            } else {
                // Check if worker could match ANY task
                const couldMatchAnyTask = tasks.some(t =>
                    this.hasAllRequiredSkills(worker, t.requiredSkills)
                );
                reason = couldMatchAnyTask ? 'all_tasks_filled' : 'no_matching_skills';
            }

            idleWorkers.push({
                workerId: worker.workerId,
                workerName: worker.name,
                reason,
                availableSkills
            });
        }

        return idleWorkers;
    }

    /**
     * Calculate summary statistics for the matching operation
     */
    private calculateStats(
        taskResults: TaskProcessingResult[],
        assignments: SkillMatchAssignment[],
        allWorkers: MatchableWorker[],
        idleWorkers: IdleWorkerResult[]
    ): MatchingStats {
        const tasksFullyStaffed = taskResults.filter(r => r.isFullyStaffed).length;
        const tasksPartiallyStaffed = taskResults.filter(r => r.isPartiallyStaffed).length;
        const tasksUnstaffed = taskResults.filter(r => r.assignedWorkers.length === 0).length;

        const totalSkillScore = assignments.reduce((sum, a) => sum + a.skillScore, 0);
        const averageSkillScore = assignments.length > 0
            ? Math.round((totalSkillScore / assignments.length) * 100) / 100
            : 0;

        return {
            totalTasks: taskResults.length,
            totalWorkers: allWorkers.length,
            tasksFullyStaffed,
            tasksPartiallyStaffed,
            tasksUnstaffed,
            workersAssigned: assignments.length,
            workersIdle: idleWorkers.length,
            averageSkillScore
        };
    }
}
