
import { WorkerTask } from '../types';

export class ResourceManager {
    private assignments: WorkerTask[] = [];
    private readonly transitionGapMs: number;

    constructor(transitionGapMs: number = 0) {
        this.transitionGapMs = transitionGapMs > 0 ? transitionGapMs : 0;
    }

    /**
     * Records a new assignment.
     */
    public addAssignment(assignment: WorkerTask): void {
        this.assignments.push(assignment);
    }

    /**
     * Checks if a worker is booked during the specified time window.
     * Returns true if there is any overlap.
     */
    public isBooked(workerId: string, start: number, end: number): boolean {
        // Strict overlap check
        return this.assignments.some(a => {
            if (a.workerId !== workerId) return false;

            const aStart = new Date(a.startDate).getTime();
            const aEnd = new Date(a.endDate).getTime();

            // Overlap condition: Not (End <= aStart OR Start >= aEnd)
            return start < aEnd && end > aStart;
        });
    }

    /**
     * Gets the Task ID assigned to the worker in the immediate previous slot.
     * Helpful for Continuity checks.
     */
    public getPreviousTask(workerId: string, currentStart: number): string | undefined {
        // Find assignment that ends shortly before the current start (transition window)
        const match = this.assignments.find(a => {
            if (a.workerId !== workerId) return false;
            const end = new Date(a.endDate).getTime();
            const delta = currentStart - end;
            if (delta < 0) return false;
            if (this.transitionGapMs === 0) {
                return delta === 0;
            }
            return delta <= this.transitionGapMs;
        });
        return match && match.taskId ? match.taskId : undefined;
    }

    /**
     * Returns the number of workers assigned to a specific task during a time window.
     * Helpful for Swarming checks / Capacity enforcement.
     */
    public getAssignedWorkerCount(taskId: string, start: number, end: number): number {
        // Count unique workers assigned to this task in this window
        const workers = new Set<string>();
        this.assignments.forEach((a: WorkerTask) => {
            if (a.taskId !== taskId) return;

            const aStart = new Date(a.startDate).getTime();
            const aEnd = new Date(a.endDate).getTime();

            if (start < aEnd && end > aStart && a.workerId) {
                workers.add(a.workerId);
            }
        });
        return workers.size;
    }

    /**
     * Get all assignments active during a window.
     */
    public getAssignmentsByTime(start: number, end: number): WorkerTask[] {
        return this.assignments.filter(a => {
            const aStart = new Date(a.startDate).getTime();
            const aEnd = new Date(a.endDate).getTime();
            return start < aEnd && end > aStart;
        });
    }

    public hasAssignmentStartingAt(taskId: string, startTime: number, toleranceMs: number = 1000): boolean {
        return this.assignments.some(a => {
            if (a.taskId !== taskId) return false;
            const aStart = new Date(a.startDate).getTime();
            return Math.abs(aStart - startTime) <= toleranceMs;
        });
    }

    public getAllAssignments(): WorkerTask[] {
        return this.assignments;
    }

    /**
     * Finds the next moment a worker is free within a window [rangeStart, rangeEnd).
     * Returns:
     * - `rangeStart` if free immediately.
     * - `t` if booked until `t` (where t < rangeEnd).
     * - `null` if booked through the entire window.
     */
    public getNextAvailability(
        workerId: string,
        rangeStart: number,
        rangeEnd: number,
        nextTaskId?: string
    ): number | null {
        const relevant = this.assignments.filter(a => a.workerId === workerId);
        if (relevant.length === 0) return rangeStart;

        let latestOverlapEnd = -Infinity;
        let latestOverlapTaskId: string | null = null;
        let latestBeforeStartEnd = -Infinity;
        let latestBeforeStartTaskId: string | null = null;

        for (const a of relevant) {
            const aStart = new Date(a.startDate).getTime();
            const aEnd = new Date(a.endDate).getTime();

            if (aEnd <= rangeStart && aEnd > latestBeforeStartEnd) {
                latestBeforeStartEnd = aEnd;
                latestBeforeStartTaskId = a.taskId ?? null;
            }

            if (aStart < rangeEnd && aEnd > rangeStart && aEnd > latestOverlapEnd) {
                latestOverlapEnd = aEnd;
                latestOverlapTaskId = a.taskId ?? null;
            }
        }

        let nextAvailable = rangeStart;
        let lastTaskId: string | null = null;
        let lastEnd = -Infinity;

        if (latestOverlapEnd !== -Infinity) {
            nextAvailable = latestOverlapEnd;
            lastTaskId = latestOverlapTaskId;
            lastEnd = latestOverlapEnd;
        } else if (latestBeforeStartEnd !== -Infinity) {
            lastTaskId = latestBeforeStartTaskId;
            lastEnd = latestBeforeStartEnd;
        }

        if (this.transitionGapMs > 0 && lastTaskId && nextTaskId && lastTaskId !== nextTaskId) {
            const gapReady = lastEnd + this.transitionGapMs;
            if (gapReady > nextAvailable) {
                nextAvailable = gapReady;
            }
        }

        if (nextAvailable >= rangeEnd) return null;
        return nextAvailable;
    }
}
