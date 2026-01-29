
import { SimulationResult, Worker, Task, Interval, WorkerTask, ShiftCompletionViolation } from '../types';

export interface ValidationReport {
    hardConstraints: {
        minWorkers: { status: 'PASS' | 'FAIL'; violations: string[] };
        maxWorkers: { status: 'PASS' | 'FAIL'; violations: string[] };
        prerequisites: { status: 'PASS' | 'FAIL'; violations: string[] };
        doubleBooking: { status: 'PASS' | 'FAIL'; violations: string[] };
        availability: { status: 'PASS' | 'FAIL'; violations: string[] };
        shiftCompletion: { status: 'PASS' | 'FAIL'; violations: ShiftCompletionViolation[] };
    };
    softConstraints: {
        prefersShiftCompletion: { status: 'PASS' | 'WARN'; warnings: string[] };
    };
    stats: {
        totalAssignments: number;
        validAssignments: number;
        invalidAssignments: number;
    };
    overallStatus: 'PASS' | 'FAIL';
}

export class VerificationService {

    public validateSchedule(result: SimulationResult, workers: Worker[], tasks: Task[]): ValidationReport {
        const report: ValidationReport = {
            hardConstraints: {
                minWorkers: { status: 'PASS', violations: [] },
                maxWorkers: { status: 'PASS', violations: [] },
                prerequisites: { status: 'PASS', violations: [] },
                doubleBooking: { status: 'PASS', violations: [] },
                availability: { status: 'PASS', violations: [] },
                shiftCompletion: { status: 'PASS', violations: [] }
            },
            softConstraints: {
                prefersShiftCompletion: { status: 'PASS', warnings: [] }
            },
            stats: { totalAssignments: 0, validAssignments: 0, invalidAssignments: 0 },
            overallStatus: 'PASS'
        };

        const assignments = result.assignments;
        report.stats.totalAssignments = assignments.length;

        const workersMap = new Map(workers.map(w => [w.workerId, w]));
        const tasksMap = new Map(tasks.map(t => [t.taskId, t]));

        // Track Concurrency & Usage
        const workerSlotUsage = new Map<string, string>(); // WorkerId|Start -> TaskId
        const taskSlotUsage = new Map<string, number>();   // TaskId|Start -> Count
        const taskEndTimes = new Map<string, number>();    // TaskId -> Max End Time (Approx)

        // 1. Build Helpers
        assignments.forEach(a => {
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();

            // Populate usage for every 30-min block covered by this assignment
            for (let time = start; time < end; time += 30 * 60 * 1000) {
                const slotKey = `${a.taskId}|${new Date(time).toISOString()}`;
                taskSlotUsage.set(slotKey, (taskSlotUsage.get(slotKey) || 0) + 1);
            }

            if (!taskEndTimes.has(a.taskId)) taskEndTimes.set(a.taskId, end);
            else taskEndTimes.set(a.taskId, Math.max(taskEndTimes.get(a.taskId)!, end));
        });

        // 2. Iterate Assignments
        for (const assign of assignments) {
            const worker = workersMap.get(assign.workerId);
            const task = tasksMap.get(assign.taskId);

            // Safety check for deleted/unknown entities
            if (!worker || !task) continue;

            let isValid = true;
            const timeSlot = `${assign.startDate.substr(11, 5)}-${assign.endDate.substr(11, 5)}`;
            const context = `[${timeSlot}] ${worker.name || worker.workerId} -> ${task.name || task.taskId}`;

            // A. Skill Check - REMOVED

            // B. Double Booking Check
            const wSlotKey = `${worker.workerId}|${assign.startDate}`;
            if (workerSlotUsage.has(wSlotKey)) {
                report.hardConstraints.doubleBooking.violations.push(`${context}: Double booked with ${workerSlotUsage.get(wSlotKey)}`);
                report.hardConstraints.doubleBooking.status = 'FAIL';
                isValid = false;
            }
            workerSlotUsage.set(wSlotKey, task.name || task.taskId);

            // E. Availability Check (New)
            // E. Availability Check (New)
            // Ensure the assignment slot falls within the worker's availability window(s)
            if (worker.availability) {
                const assignStart = new Date(assign.startDate).getTime();
                const assignEnd = new Date(assign.endDate).getTime();

                const intervals = Array.isArray(worker.availability) ? worker.availability : [worker.availability];

                // Check if the assignment is fully contained within ANY valid interval
                const isContained = intervals.some(iv => {
                    const availStart = new Date(iv.startTime).getTime();
                    const availEnd = new Date(iv.endTime).getTime();
                    return assignStart >= availStart && assignEnd <= availEnd;
                });

                if (!isContained) {
                    const ranges = intervals.map(iv => `${iv.startTime}-${iv.endTime}`).join(', ');
                    report.hardConstraints.availability.violations.push(`${context}: Outside Availability (${ranges})`);
                    report.hardConstraints.availability.status = 'FAIL';
                    isValid = false;
                }
            }

            // C. Prerequisite Check
            // A task instance at time T is valid ONLY if all prereqs finished BEFORE T.
            if (task.prerequisiteTaskIds) {
                const currentStart = new Date(assign.startDate).getTime();
                for (const pid of task.prerequisiteTaskIds) {
                    const pEnd = taskEndTimes.get(pid);
                    // Constraint: Start >= Prereq End
                    // If pEnd is undefined, Prereq never ran -> FAIL
                    if (!pEnd || currentStart < pEnd) {
                        const pName = tasksMap.get(pid)?.name || pid;
                        report.hardConstraints.prerequisites.violations.push(`${context}: Prereq '${pName}' not done (Ends: ${pEnd ? new Date(pEnd).toISOString().substr(11, 8) : 'Never'})`);
                        report.hardConstraints.prerequisites.status = 'FAIL';
                        isValid = false;
                    }
                }
            }

            // D. Min/Max Workers Check (Task Level)
            // We only need to check this once per task-slot, but checking per assignment is fine strictly speaking (idempotent failure)
            const skipWorkerConstraints = task.taskType === 'nonWorker'
                || (task.minWorkers === 0 && task.maxWorkers === 0);
            if (!skipWorkerConstraints) {
                const count = taskSlotUsage.get(`${assign.taskId}|${assign.startDate}`) || 0;
                if (task.minWorkers && count < task.minWorkers) {
                    // Push violation only once per slot to avoid spam? 
                    // Simple array check or Set could work, but let's just push.
                    // Limit unique strings later if needed.
                    // Actually, let's limit in the violation list if it gets too long.
                    if (report.hardConstraints.minWorkers.violations.length < 50) {
                        report.hardConstraints.minWorkers.violations.push(`${context}: Below Min (${count} < ${task.minWorkers})`);
                    }
                    report.hardConstraints.minWorkers.status = 'FAIL';
                    isValid = false;
                }
                if (task.maxWorkers && count > task.maxWorkers) {
                    if (report.hardConstraints.maxWorkers.violations.length < 50) {
                        report.hardConstraints.maxWorkers.violations.push(`${context}: Above Max (${count} > ${task.maxWorkers})`);
                    }
                    report.hardConstraints.maxWorkers.status = 'FAIL';
                    isValid = false;
                }
            }

            if (isValid) report.stats.validAssignments++;
            else report.stats.invalidAssignments++;
        }

        if (report.stats.invalidAssignments > 0) report.overallStatus = 'FAIL';

        return report;
    }

    /**
     * Validate multi-shift schedules for shift completion constraints
     * This checks mustCompleteWithinShift and prefersCompleteWithinShift constraints
     */
    public validateMultiShiftConstraints(
        assignments: WorkerTask[],
        tasks: Task[],
        shift1End: Date,
        shift2Start?: Date
    ): {
        hardViolations: ShiftCompletionViolation[];
        softWarnings: string[];
    } {
        const hardViolations: ShiftCompletionViolation[] = [];
        const softWarnings: string[] = [];

        const tasksMap = new Map(tasks.map(t => [t.taskId, t]));

        // Group assignments by task
        const taskAssignments = new Map<string, WorkerTask[]>();
        assignments.forEach(a => {
            if (!a.taskId) return;
            if (!taskAssignments.has(a.taskId)) {
                taskAssignments.set(a.taskId, []);
            }
            taskAssignments.get(a.taskId)!.push(a);
        });

        // Calculate hours worked per task
        const calculateHours = (assigns: WorkerTask[]): number => {
            return assigns.reduce((sum, a) => {
                const start = new Date(a.startDate).getTime();
                const end = new Date(a.endDate).getTime();
                return sum + (end - start) / (1000 * 60 * 60);
            }, 0);
        };

        // Check each task
        for (const task of tasks) {
            const taskName = task.name || task.taskId;
            const assigns = taskAssignments.get(task.taskId) || [];
            const totalWorked = calculateHours(assigns);
            const totalRequired = task.estimatedTotalLaborHours || 0;

            // Determine if task spans shifts
            let hasShift1Work = false;
            let hasShift2Work = false;

            if (shift2Start) {
                const shift1EndMs = shift1End.getTime();
                const shift2StartMs = shift2Start.getTime();

                assigns.forEach(a => {
                    const startMs = new Date(a.startDate).getTime();
                    if (startMs < shift1EndMs) hasShift1Work = true;
                    if (startMs >= shift2StartMs) hasShift2Work = true;
                });
            } else {
                hasShift1Work = assigns.length > 0;
            }

            const spansShifts = hasShift1Work && hasShift2Work;
            const isComplete = totalWorked >= totalRequired * 0.999;
            const notStarted = assigns.length === 0;

            // Check mustCompleteWithinShift (HARD constraint)
            if (task.shiftCompletionPreference === 'mustCompleteWithinShift') {
                if (notStarted) {
                    hardViolations.push({
                        taskId: task.taskId,
                        taskName: task.name,
                        type: 'not_started',
                        message: `Task ${taskName} has mustCompleteWithinShift but was never started`
                    });
                } else if (spansShifts) {
                    hardViolations.push({
                        taskId: task.taskId,
                        taskName: task.name,
                        type: 'spans_shifts',
                        message: `Task ${taskName} has mustCompleteWithinShift but spans across shifts`
                    });
                } else if (!isComplete) {
                    const pct = totalRequired > 0 ? (totalWorked / totalRequired * 100).toFixed(1) : '0';
                    hardViolations.push({
                        taskId: task.taskId,
                        taskName: task.name,
                        type: 'not_finished',
                        message: `Task ${taskName} has mustCompleteWithinShift but was not completed (${pct}% done)`
                    });
                }
            }

            // Check prefersCompleteWithinShift (SOFT constraint - warnings only)
            if (task.shiftCompletionPreference === 'prefersCompleteWithinShift') {
                if (spansShifts) {
                    softWarnings.push(
                        `Task ${taskName} has prefersCompleteWithinShift but spans across shifts`
                    );
                }
            }
        }

        return { hardViolations, softWarnings };
    }
}
