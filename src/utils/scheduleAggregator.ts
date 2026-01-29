
import { SimulationResult, AggregatedAssignment, UnassignedWorkerPeriod, UnassignedTaskPeriod } from '../types';

interface RawStep {
    startDate: string;
    endDate: string;
    type: 'assignment' | 'worker_idle' | 'task_unfilled' | 'comment';
    workerId?: string | null;
    taskId?: string | null;
    taskName?: string; // Added field
    comment?: string; // Narrative
    isWaitTask?: boolean;
}

/**
 * Generic helper to merge consecutive items in a list.
 * Useful for post-processing API responses for UI.
 */
export function mergeConsecutiveItems(items: any[]): any[] {
    if (!items || items.length === 0) return [];

    // Sort by Worker/Task Key -> StartTime
    // We treat 'workerId' or 'taskId' as the primary grouping key depending on what exists
    const sorted = [...items].sort((a, b) => {
        const keyA = a.workerId || a.taskId || "";
        const keyB = b.workerId || b.taskId || "";
        if (keyA !== keyB) return keyA.localeCompare(keyB);
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    const merged: any[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        // Key Check
        const currentKey = current.workerId || current.taskId || "";
        const nextKey = next.workerId || next.taskId || "";

        // Additional TaskId check if both have it (for worker assignments)
        const currentTask = current.taskId || "";
        const nextTask = next.taskId || "";

        const isSameEntity = currentKey === nextKey && currentTask === nextTask;

        // Time Check
        const currentEnd = new Date(current.endDate).getTime();
        const nextStart = new Date(next.startDate).getTime();
        const isContinuous = Math.abs(nextStart - currentEnd) < 2000; // 2s tolerance

        if (isSameEntity && isContinuous) {
            // Merge: extend end date
            current = { ...current, endDate: next.endDate };
        } else {
            merged.push(current);
            current = next;
        }
    }
    merged.push(current);
    return merged;
}

/**
 * Aggregates contiguous time-step blocks into longer time blocks.
 */
export function aggregateSchedule(rawSteps: RawStep[]): SimulationResult {
    const assignments: AggregatedAssignment[] = [];
    const unassignedWorkers: UnassignedWorkerPeriod[] = [];
    const unassignedTasks: UnassignedTaskPeriod[] = [];

    // Helper to process a specific collection type
    const processCollection = (
        filterType: 'assignment' | 'worker_idle' | 'task_unfilled',
        keyFn: (item: RawStep) => string
    ) => {
        const items = rawSteps.filter(s => s.type === filterType);

        // 1. Initial Sort for Aggregation (Must group by Key first, then Time)
        // This ensures contiguous blocks for the same entity are adjacent.
        items.sort((a, b) => {
            const kA = keyFn(a);
            const kB = keyFn(b);
            if (kA !== kB) return kA.localeCompare(kB);
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        const result: any[] = [];
        let current: any = null;
        let currentKey: string | null = null;

        for (const item of items) {
            const key = keyFn(item);

            // Check if contiguous with current
            if (current &&
                currentKey === key &&
                new Date(current.endDate).getTime() === new Date(item.startDate).getTime()) {
                // Merge
                current.endDate = item.endDate;
            } else {
                // Push previous and start new
                if (current) result.push(current);

                currentKey = key;
                // Initialize new block based on type
                if (filterType === 'assignment') {
                    current = {
                        workerId: item.workerId!,
                        taskId: item.taskId!,
                        taskName: item.taskName, // Pass name
                        startDate: item.startDate,
                        endDate: item.endDate,
                        isWaitTask: item.isWaitTask
                    };
                } else if (filterType === 'worker_idle') {
                    current = {
                        workerId: item.workerId!,
                        startDate: item.startDate,
                        endDate: item.endDate
                    };
                } else {
                    current = {
                        taskId: item.taskId!,
                        taskName: item.taskName, // Include Name
                        startDate: item.startDate,
                        endDate: item.endDate
                    };
                }
            }
        }
        if (current) result.push(current);
        return result;
    };

    // 1. Assignments
    const aggAssignments = processCollection('assignment', (i) => `${i.workerId}::${i.taskId}`);

    // SORT Assignments: Task Name (A-Z) -> Start Time
    aggAssignments.sort((a: AggregatedAssignment, b: AggregatedAssignment) => {
        // Handle missing names by falling back to ID or empty string
        const nameA = a.taskName || a.taskId || "";
        const nameB = b.taskName || b.taskId || "";

        const nameComp = nameA.localeCompare(nameB);
        if (nameComp !== 0) return nameComp;

        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    assignments.push(...aggAssignments);

    // 2. Unassigned Workers
    const aggWorkers = processCollection('worker_idle', (i) => i.workerId!);
    // SORT: Start Time
    aggWorkers.sort((a: UnassignedWorkerPeriod, b: UnassignedWorkerPeriod) => {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
    unassignedWorkers.push(...aggWorkers);

    // 3. Unassigned Tasks
    const aggTasks = processCollection('task_unfilled', (i) => i.taskId!);
    // SORT: Start Time
    aggTasks.sort((a: UnassignedTaskPeriod, b: UnassignedTaskPeriod) => {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
    unassignedTasks.push(...aggTasks);

    // 4. Build the "Story" (Assignments + Comments)
    const story: any[] = [];

    // Add Comments
    const comments = rawSteps.filter(s => s.type === 'comment').map(c => ({
        comment: c.comment,
        startTime: c.startDate || (c as any).startTime, // Handle legacy/new mismatch
        type: 'comment'
    }));
    story.push(...comments);

    // Add Assignments (Mapped to V2 keys)
    assignments.forEach(a => {
        story.push({
            ...a,
            startTime: a.startDate,
            endTime: a.endDate,
            startDate: undefined, // remove legacy
            endDate: undefined    // remove legacy
        });
    });

    // Sort Story: Time -> Type (Comments first)
    story.sort((a, b) => {
        const timeA = new Date(a.startTime).getTime();
        const timeB = new Date(b.startTime).getTime();
        if (timeA !== timeB) return timeA - timeB;
        if (a.type === 'comment' && b.type !== 'comment') return -1;
        if (a.type !== 'comment' && b.type === 'comment') return 1;
        return 0;
    });

    return {
        assignments,
        unassignedWorkers,
        unassignedTasks,
        story
    };
}
