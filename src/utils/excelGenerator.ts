
import * as XLSX from 'xlsx';
import { SimulationResult, Task, WorkerTask, DeficitTask, TaskShiftProgress, ShiftSummary } from '../types';
import { ValidationReport } from '../services/verificationService';

// Multi-shift result structure for Excel export
export interface MultiShiftExcelData {
    assignments: WorkerTask[];
    idleWorkers: WorkerTask[];
    deficitTasks: DeficitTask[];
    taskProgress: TaskShiftProgress[];
    shift1Summary: ShiftSummary;
    shift2Summary?: ShiftSummary;
    shift1Pct: number;  // Expected percentage (e.g., 0.75)
    shift2Pct: number;  // Expected percentage (e.g., 0.25)
    shift1Date: string; // e.g., "2024-01-01"
    shift2Date?: string; // e.g., "2024-01-02"
}

/**
 * Generates Excel file for multi-shift planning results with separate sheets per shift.
 * Sheets: Summary, Shift 1 Assignments, Shift 2 Assignments, Shift 1 Completion,
 *         Shift 2 Completion, Overall Completion, Idle Workers, Deficit Tasks
 */
export function generateMultiShiftResultsExcel(
    data: MultiShiftExcelData,
    tasks: Task[]
): Buffer {
    const wb = XLSX.utils.book_new();

    // Helper to extract date from ISO string
    const getDateKey = (dateStr: string) => dateStr.split('T')[0];

    // MERGE LOGIC: Combine consecutive blocks for cleaner Excel output
    const mergeConsecutive = (items: WorkerTask[]) => {
        if (items.length === 0) return [];
        // Sort: Worker -> StartTime
        const sorted = [...items].sort((a, b) => {
            if (a.workerId !== b.workerId) return (a.workerId || "").localeCompare(b.workerId || "");
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        const merged: WorkerTask[] = [];
        let current = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const next = sorted[i];
            const currentEnd = new Date(current.endDate).getTime();
            const nextStart = new Date(next.startDate).getTime();

            // Allow 1 second tolerance for continuity
            const isContinuous = Math.abs(nextStart - currentEnd) < 2000;
            const isSameWorker = current.workerId === next.workerId;
            const isSameTask = current.taskId === next.taskId;

            if (isSameWorker && isSameTask && isContinuous) {
                // Merge: extend end date
                current = { ...current, endDate: next.endDate };
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);
        return merged;
    };

    // Separate assignments by shift date AND MERGE THEM
    const rawShift1 = data.assignments.filter(a => getDateKey(a.startDate) === data.shift1Date);
    const rawShift2 = data.shift2Date ? data.assignments.filter(a => getDateKey(a.startDate) === data.shift2Date) : [];

    const shift1Assignments = mergeConsecutive(rawShift1);
    const shift2Assignments = mergeConsecutive(rawShift2);

    // Calculate actual hours per shift
    const calcHours = (assignments: WorkerTask[]) => {
        return assignments.reduce((total, a) => {
            const dur = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
            return total + dur;
        }, 0);
    };

    const shift1Hours = calcHours(shift1Assignments);
    const shift2Hours = calcHours(shift2Assignments);
    const totalHours = shift1Hours + shift2Hours;
    const actualShift1Pct = totalHours > 0 ? (shift1Hours / totalHours) * 100 : 0;
    const actualShift2Pct = totalHours > 0 ? (shift2Hours / totalHours) * 100 : 0;

    // =====================
    // 1. SUMMARY SHEET
    // =====================
    const summaryData = [
        ["Multi-Shift Planning Results", ""],
        ["Generated", new Date().toISOString()],
        [],
        ["═══ SHIFT SPLIT VERIFICATION ═══", ""],
        [],
        ["Metric", "Expected", "Actual", "Status"],
        ["Shift 1 Percentage", `${(data.shift1Pct * 100).toFixed(0)}%`, `${actualShift1Pct.toFixed(1)}%`,
            Math.abs(actualShift1Pct - data.shift1Pct * 100) <= 10 ? "✅ OK" : "⚠️ Outside tolerance"],
        ["Shift 2 Percentage", `${(data.shift2Pct * 100).toFixed(0)}%`, `${actualShift2Pct.toFixed(1)}%`,
            Math.abs(actualShift2Pct - data.shift2Pct * 100) <= 10 ? "✅ OK" : "⚠️ Outside tolerance"],
        [],
        ["═══ HOURS BREAKDOWN ═══", ""],
        [],
        ["Shift", "Date", "Assignments", "Hours Worked", "Percentage"],
        ["Shift 1", data.shift1Date, shift1Assignments.length, shift1Hours.toFixed(2), `${actualShift1Pct.toFixed(1)}%`],
        ["Shift 2", data.shift2Date || "N/A", shift2Assignments.length, shift2Hours.toFixed(2), `${actualShift2Pct.toFixed(1)}%`],
        ["TOTAL", "", data.assignments.length, totalHours.toFixed(2), "100%"],
        [],
        ["═══ TASK SUMMARY ═══", ""],
        [],
        ["Completed in Shift 1", data.shift1Summary?.tasksCompleted?.length || 0],
        ["Completed in Shift 2", data.shift2Summary?.tasksCompleted?.length || 0],
        ["In Progress (Shift 1)", data.shift1Summary?.tasksInProgress?.length || 0],
        ["In Progress (Shift 2)", data.shift2Summary?.tasksInProgress?.length || 0],
        ["Deficit Tasks", data.deficitTasks.length],
        [],
        ["═══ PRODUCTION RATES ═══", ""],
        [],
        ["Shift 1 Rate", data.shift1Summary?.productionRate?.toFixed(2) || "N/A"],
        ["Shift 2 Rate", data.shift2Summary?.productionRate?.toFixed(2) || "N/A"],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // =====================
    // 2. SHIFT 1 ASSIGNMENTS
    // =====================
    const getTaskName = (taskId: string | null) => {
        if (!taskId) return "IDLE";
        const task = tasks.find(t => t.taskId === taskId);
        return task?.name || taskId;
    };

    const shift1AssignData = shift1Assignments.map(a => ({
        Worker: a.workerId || "N/A",
        Task: getTaskName(a.taskId),
        TaskId: a.taskId || "IDLE",
        Start: a.startDate,
        End: a.endDate,
        DurationHrs: ((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60)).toFixed(2)
    }));
    const wsShift1Assign = XLSX.utils.json_to_sheet(shift1AssignData.length > 0 ? shift1AssignData : [{ Worker: "No assignments", Task: "", TaskId: "", Start: "", End: "", DurationHrs: "" }]);
    XLSX.utils.book_append_sheet(wb, wsShift1Assign, "Shift 1 Assignments");

    // =====================
    // 3. SHIFT 2 ASSIGNMENTS
    // =====================
    const shift2AssignData = shift2Assignments.map(a => ({
        Worker: a.workerId || "N/A",
        Task: getTaskName(a.taskId),
        TaskId: a.taskId || "IDLE",
        Start: a.startDate,
        End: a.endDate,
        DurationHrs: ((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60)).toFixed(2)
    }));
    const wsShift2Assign = XLSX.utils.json_to_sheet(shift2AssignData.length > 0 ? shift2AssignData : [{ Worker: "No assignments", Task: "", TaskId: "", Start: "", End: "", DurationHrs: "" }]);
    XLSX.utils.book_append_sheet(wb, wsShift2Assign, "Shift 2 Assignments");

    // =====================
    // 4. SHIFT 1 COMPLETION STATUS
    // =====================
    const shift1CompletionData = data.taskProgress.map(tp => {
        const shift1Pct = tp.totalRequiredHours > 0
            ? Math.min(100, (tp.shift1Hours / tp.totalRequiredHours) * 100)
            : 0;
        return {
            Task: tp.taskName || tp.taskId,
            TaskId: tp.taskId,
            "Shift 1 Hours": tp.shift1Hours.toFixed(2),
            "Total Required": tp.totalRequiredHours.toFixed(2),
            "Shift 1 Progress": `${shift1Pct.toFixed(1)}%`,
            "Status": shift1Pct >= 100 ? "✅ Complete" : (shift1Pct > 0 ? "🚧 In Progress" : "🛑 Not Started")
        };
    });
    const wsShift1Comp = XLSX.utils.json_to_sheet(shift1CompletionData);
    XLSX.utils.book_append_sheet(wb, wsShift1Comp, "Shift 1 Completion");

    // =====================
    // 5. SHIFT 2 COMPLETION STATUS
    // =====================
    const shift2CompletionData = data.taskProgress.map(tp => {
        const shift2Pct = tp.totalRequiredHours > 0
            ? Math.min(100, (tp.shift2Hours / tp.totalRequiredHours) * 100)
            : 0;
        const cumulativePct = tp.totalRequiredHours > 0
            ? Math.min(100, ((tp.shift1Hours + tp.shift2Hours) / tp.totalRequiredHours) * 100)
            : 0;
        return {
            Task: tp.taskName || tp.taskId,
            TaskId: tp.taskId,
            "Carried From Shift 1": tp.shift1Hours.toFixed(2),
            "Shift 2 Hours": tp.shift2Hours.toFixed(2),
            "Total Required": tp.totalRequiredHours.toFixed(2),
            "Shift 2 Progress": `${shift2Pct.toFixed(1)}%`,
            "Cumulative Progress": `${cumulativePct.toFixed(1)}%`,
            "Status": cumulativePct >= 100 ? "✅ Complete" : (cumulativePct > 0 ? "🚧 In Progress" : "🛑 Not Started")
        };
    });
    const wsShift2Comp = XLSX.utils.json_to_sheet(shift2CompletionData);
    XLSX.utils.book_append_sheet(wb, wsShift2Comp, "Shift 2 Completion");

    // =====================
    // 6. OVERALL COMPLETION
    // =====================
    const overallCompletionData = data.taskProgress.map(tp => ({
        Task: tp.taskName || tp.taskId,
        TaskId: tp.taskId,
        "Shift 1 Hours": tp.shift1Hours.toFixed(2),
        "Shift 2 Hours": tp.shift2Hours.toFixed(2),
        "Total Worked": (tp.shift1Hours + tp.shift2Hours).toFixed(2),
        "Total Required": tp.totalRequiredHours.toFixed(2),
        "Completion %": `${tp.completionPercentage.toFixed(1)}%`,
        "Completed In": tp.completedInShift === 'shift1' ? "Shift 1"
            : tp.completedInShift === 'shift2' ? "Shift 2"
                : tp.completedInShift === 'spans_shifts' ? "Spans Both Shifts"
                    : "Incomplete",
        "Preference": tp.shiftCompletionPreference || "N/A"
    }));
    const wsOverall = XLSX.utils.json_to_sheet(overallCompletionData);
    XLSX.utils.book_append_sheet(wb, wsOverall, "Overall Completion");

    // =====================
    // 7. IDLE WORKERS
    // =====================
    const rawShift1Idle = data.idleWorkers.filter(i => getDateKey(i.startDate) === data.shift1Date);
    const rawShift2Idle = data.shift2Date
        ? data.idleWorkers.filter(i => getDateKey(i.startDate) === data.shift2Date)
        : [];

    const shift1Idle = mergeConsecutive(rawShift1Idle);
    const shift2Idle = mergeConsecutive(rawShift2Idle);

    const idleData = [
        ...shift1Idle.map(i => ({
            Shift: "Shift 1",
            Worker: i.workerId,
            Start: i.startDate,
            End: i.endDate,
            DurationHrs: ((new Date(i.endDate).getTime() - new Date(i.startDate).getTime()) / (1000 * 60 * 60)).toFixed(2)
        })),
        ...shift2Idle.map(i => ({
            Shift: "Shift 2",
            Worker: i.workerId,
            Start: i.startDate,
            End: i.endDate,
            DurationHrs: ((new Date(i.endDate).getTime() - new Date(i.startDate).getTime()) / (1000 * 60 * 60)).toFixed(2)
        }))
    ];
    const wsIdle = XLSX.utils.json_to_sheet(idleData.length > 0 ? idleData : [{ Shift: "No idle periods", Worker: "", Start: "", End: "", DurationHrs: "" }]);
    XLSX.utils.book_append_sheet(wb, wsIdle, "Idle Workers");

    // =====================
    // 8. DEFICIT TASKS
    // =====================
    const deficitData = data.deficitTasks.map(d => ({
        Task: getTaskName(d.taskId),
        TaskId: d.taskId,
        "Deficit Hours": d.deficitHours.toFixed(2),
        "Required Skills": d.requiredSkills?.join(", ") || "N/A"
    }));
    const wsDeficit = XLSX.utils.json_to_sheet(deficitData.length > 0 ? deficitData : [{ Task: "No deficits", TaskId: "", "Deficit Hours": "", "Required Skills": "" }]);
    XLSX.utils.book_append_sheet(wb, wsDeficit, "Deficit Tasks");

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function generateResultsExcel(
    result: SimulationResult,
    tasks: Task[],
    report: ValidationReport
): Buffer {

    // 1. Create Graphs / Summary Sheet
    // Summary
    const summaryData = [
        ["Planning Validation Report", ""],
        ["Status", report.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'],
        ["Timestamp", new Date().toISOString()],
        [],
        ["Stats", ""],
        ["Total Assignments", report.stats.totalAssignments],
        ["Valid Assignments", report.stats.validAssignments],
        ["Invalid Assignments", report.stats.invalidAssignments],
        [],
        ["Constraint Checks", "Status", "Violations"],
        ["Hard: Min Workers", report.hardConstraints.minWorkers.status, report.hardConstraints.minWorkers.violations.length],
        ["Hard: Max Workers", report.hardConstraints.maxWorkers.status, report.hardConstraints.maxWorkers.violations.length],
        ["Hard: Dependencies", report.hardConstraints.prerequisites.status, report.hardConstraints.prerequisites.violations.length],
        ["Hard: Double Booking", report.hardConstraints.doubleBooking.status, report.hardConstraints.doubleBooking.violations.length],
    ];

    // Add violation details if any
    let rowIdx = 16;
    const addViolations = (type: string, list: string[]) => {
        if (list.length > 0) {
            summaryData.push(["", "", ""]);
            summaryData.push([`>>> ${type} Details`, "", ""]);
            list.forEach(v => summaryData.push(["", "", v]));
        }
    };
    addViolations("Min Workers", report.hardConstraints.minWorkers.violations);
    addViolations("Max Workers", report.hardConstraints.maxWorkers.violations);
    addViolations("Dependencies", report.hardConstraints.prerequisites.violations);
    addViolations("Double Booking", report.hardConstraints.doubleBooking.violations);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // 2. Assignments Sheet
    // MERGE LOGIC Reuse
    const mergeConsecutive = (items: any[]) => {
        if (items.length === 0) return [];
        const sorted = [...items].sort((a, b) => {
            if (a.workerId !== b.workerId) return (a.workerId || "").localeCompare(b.workerId || "");
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        const merged: any[] = [];
        let current = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const next = sorted[i];
            const currentEnd = new Date(current.endDate).getTime();
            const nextStart = new Date(next.startDate).getTime();

            const isContinuous = Math.abs(nextStart - currentEnd) < 2000;
            const isSameWorker = current.workerId === next.workerId;
            const isSameTask = current.taskId === next.taskId;

            if (isSameWorker && isSameTask && isContinuous) {
                current = { ...current, endDate: next.endDate };
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);
        return merged;
    };

    const mergedAssignments = mergeConsecutive(result.assignments);

    const assignData = mergedAssignments.map(a => ({
        Task: a.taskName || a.taskId,
        TaskId: a.taskId,
        Worker: a.workerId,
        Start: a.startDate,
        End: a.endDate
    }));
    const wsAssignments = XLSX.utils.json_to_sheet(assignData);

    // 3. Idle Workers Sheet
    const mergedIdle = mergeConsecutive(result.unassignedWorkers.map(u => ({
        ...u,
        taskId: 'IDLE' // Normalize for merge logic
    })));

    const idleWData = mergedIdle.map(u => ({
        Worker: u.workerId,
        Start: u.startDate,
        End: u.endDate
    }));
    const wsIdleW = XLSX.utils.json_to_sheet(idleWData);

    // 4. Task Idle Periods (Unfilled)
    const unsTasksData = result.unassignedTasks.map(u => ({
        Task: tasks.find(t => t.taskId === u.taskId)?.name || u.taskId,
        TaskId: u.taskId,
        Start: u.startDate,
        End: u.endDate
    }));
    const wsIdleT = XLSX.utils.json_to_sheet(unsTasksData);

    // 5. Work Completion Sheet
    // We calculate progress based on assignments
    const progressMap = new Map<string, number>();
    result.assignments.forEach(a => {
        const dur = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
        progressMap.set(a.taskId, (progressMap.get(a.taskId) || 0) + dur);
    });

    const completionData = tasks.map(t => {
        const done = progressMap.get(t.taskId) || 0;
        const total = t.estimatedTotalLaborHours || 0;
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        const isNonWorker = t.taskType === 'nonWorker'
            || (t.minWorkers === 0 && t.maxWorkers === 0);
        const taskType = t.taskType || (isNonWorker ? 'nonWorker' : 'default');
        return {
            Task: t.name || t.taskId,
            TaskId: t.taskId,
            "Task Type": taskType,
            DoneHours: done.toFixed(2),
            TotalHours: total.toFixed(2),
            Progress: `${pct}%`,
            Status: pct >= 100 ? '✅ Complete' : (pct > 0 ? '🚧 In Progress' : '🛑 Not Started')
        };
    });
    const wsCompletion = XLSX.utils.json_to_sheet(completionData);

    // Pack Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Verification Report");
    XLSX.utils.book_append_sheet(wb, wsAssignments, "Assignments");
    XLSX.utils.book_append_sheet(wb, wsCompletion, "Completion Status");
    XLSX.utils.book_append_sheet(wb, wsIdleW, "Idle Workers");
    XLSX.utils.book_append_sheet(wb, wsIdleT, "Task Idle Periods");

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
