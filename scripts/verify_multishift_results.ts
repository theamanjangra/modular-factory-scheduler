import * as XLSX from 'xlsx';
import * as path from 'path';

interface Worker {
    workerId: string;
    name: string;
    availability?: string;
}

interface Task {
    taskId: string;
    name?: string;
    minWorkers?: number;
    maxWorkers?: number;
    estimatedTotalLaborHours?: number;
    prerequisiteTaskIds?: string;
}

interface Assignment {
    workerId: string;
    taskId: string;
    startDate: string;
    endDate: string;
    shiftId?: string;
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    stats: {
        totalAssignments: number;
        shift1Assignments: number;
        shift2Assignments: number;
        shift1Hours: number;
        shift2Hours: number;
        shift1Pct: number;
        shift2Pct: number;
    };
}

function parseTime(dateStr: string): Date {
    return new Date(dateStr);
}

function getHours(start: string, end: string): number {
    const s = parseTime(start);
    const e = parseTime(end);
    return (e.getTime() - s.getTime()) / (1000 * 60 * 60);
}

function getDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function verifyMultiShiftResults(
    inputFile: string,
    resultsFile: string,
    expectedShift1Pct: number = 0.75,
    expectedShift2Pct: number = 0.25
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('Reading input file:', inputFile);
    const inputWorkbook = XLSX.readFile(inputFile);

    // Read Workers
    const workersSheet = inputWorkbook.Sheets['Workers'];
    if (!workersSheet) {
        errors.push('Workers sheet not found in input file');
        return {
            isValid: false,
            errors,
            warnings,
            stats: { totalAssignments: 0, shift1Assignments: 0, shift2Assignments: 0, shift1Hours: 0, shift2Hours: 0, shift1Pct: 0, shift2Pct: 0 }
        };
    }
    const workersData: any[] = XLSX.utils.sheet_to_json(workersSheet);
    const workers: Worker[] = workersData.map(w => ({
        workerId: w.workerId || w.WorkerID,
        name: w.name || w.Name,
        availability: w.availability
    }));

    // Read Tasks
    const tasksSheet = inputWorkbook.Sheets['Tasks'];
    if (!tasksSheet) {
        errors.push('Tasks sheet not found in input file');
        return {
            isValid: false,
            errors,
            warnings,
            stats: { totalAssignments: 0, shift1Assignments: 0, shift2Assignments: 0, shift1Hours: 0, shift2Hours: 0, shift1Pct: 0, shift2Pct: 0 }
        };
    }
    const tasksData: any[] = XLSX.utils.sheet_to_json(tasksSheet);
    const tasks: Task[] = tasksData.map(t => ({
        taskId: t.taskId || t.TaskID,
        name: t.name || t.Name,
        minWorkers: t.minWorkers || t.MinWorkers,
        maxWorkers: t.maxWorkers || t.MaxWorkers,
        estimatedTotalLaborHours: t.estimatedTotalLaborHours || t.EstimatedTotalLaborHours,
        prerequisiteTaskIds: t.prerequisiteTaskIds || t.PrerequisiteTaskIDs
    }));

    console.log(`Loaded ${workers.length} workers and ${tasks.length} tasks`);

    // Read Results
    console.log('Reading results file:', resultsFile);
    const resultsWorkbook = XLSX.readFile(resultsFile);

    const assignmentsSheet = resultsWorkbook.Sheets['Assignments'];
    if (!assignmentsSheet) {
        errors.push('Assignments sheet not found in results file');
        return {
            isValid: false,
            errors,
            warnings,
            stats: { totalAssignments: 0, shift1Assignments: 0, shift2Assignments: 0, shift1Hours: 0, shift2Hours: 0, shift1Pct: 0, shift2Pct: 0 }
        };
    }

    const assignmentsData: any[] = XLSX.utils.sheet_to_json(assignmentsSheet);
    const assignments: Assignment[] = assignmentsData.map(a => ({
        workerId: a.Worker || a.workerId || a.WorkerID,
        taskId: a.TaskId || a.taskId || a.TaskID,
        startDate: a.Start || a.startDate || a.StartDate,
        endDate: a.End || a.endDate || a.EndDate,
        shiftId: a.Shift || a.shiftId || a.ShiftID
    }));

    console.log(`\n=== MULTI-SHIFT VERIFICATION ===`);
    console.log(`Total Assignments: ${assignments.length}`);
    console.log(`Expected Shift 1 %: ${expectedShift1Pct * 100}%`);
    console.log(`Expected Shift 2 %: ${expectedShift2Pct * 100}%\n`);

    // Group assignments by day/shift
    const shift1Assignments: Assignment[] = [];
    const shift2Assignments: Assignment[] = [];

    const dayGroups = new Map<string, Assignment[]>();

    assignments.forEach(a => {
        const start = parseTime(a.startDate);
        const dayKey = getDateKey(start);

        if (!dayGroups.has(dayKey)) {
            dayGroups.set(dayKey, []);
        }
        dayGroups.get(dayKey)!.push(a);
    });

    const sortedDays = Array.from(dayGroups.keys()).sort();
    console.log(`Found ${sortedDays.length} unique days:\n`);

    sortedDays.forEach((day, idx) => {
        const dayAssignments = dayGroups.get(day)!;
        console.log(`Day ${idx + 1} (${day}): ${dayAssignments.length} assignments`);

        if (idx === 0) {
            shift1Assignments.push(...dayAssignments);
        } else if (idx === 1) {
            shift2Assignments.push(...dayAssignments);
        }
    });

    console.log(`\nShift 1 Assignments: ${shift1Assignments.length}`);
    console.log(`Shift 2 Assignments: ${shift2Assignments.length}`);

    // Calculate hours
    let shift1Hours = 0;
    let shift2Hours = 0;

    shift1Assignments.forEach(a => {
        shift1Hours += getHours(a.startDate, a.endDate);
    });

    shift2Assignments.forEach(a => {
        shift2Hours += getHours(a.startDate, a.endDate);
    });

    const totalHours = shift1Hours + shift2Hours;
    const actualShift1Pct = totalHours > 0 ? shift1Hours / totalHours : 0;
    const actualShift2Pct = totalHours > 0 ? shift2Hours / totalHours : 0;

    console.log(`\n=== HOURS BREAKDOWN ===`);
    console.log(`Shift 1 Hours: ${shift1Hours.toFixed(2)}h (${(actualShift1Pct * 100).toFixed(1)}%)`);
    console.log(`Shift 2 Hours: ${shift2Hours.toFixed(2)}h (${(actualShift2Pct * 100).toFixed(1)}%)`);
    console.log(`Total Hours: ${totalHours.toFixed(2)}h`);

    // Verify shift percentages
    const pctTolerance = 0.05; // 5% tolerance
    if (Math.abs(actualShift1Pct - expectedShift1Pct) > pctTolerance) {
        warnings.push(
            `Shift 1 percentage mismatch: Expected ${(expectedShift1Pct * 100).toFixed(1)}%, Got ${(actualShift1Pct * 100).toFixed(1)}%`
        );
    }

    if (Math.abs(actualShift2Pct - expectedShift2Pct) > pctTolerance) {
        warnings.push(
            `Shift 2 percentage mismatch: Expected ${(expectedShift2Pct * 100).toFixed(1)}%, Got ${(actualShift2Pct * 100).toFixed(1)}%`
        );
    }

    // Check for overlapping assignments (same worker assigned to multiple tasks at the same time)
    console.log(`\n=== CHECKING FOR CONFLICTS ===`);
    const workerTimelines = new Map<string, Assignment[]>();

    assignments.forEach(a => {
        if (!workerTimelines.has(a.workerId)) {
            workerTimelines.set(a.workerId, []);
        }
        workerTimelines.get(a.workerId)!.push(a);
    });

    workerTimelines.forEach((workerAssignments, workerId) => {
        const sorted = workerAssignments.sort(
            (a, b) => parseTime(a.startDate).getTime() - parseTime(b.startDate).getTime()
        );

        for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];

            const currentEnd = parseTime(current.endDate);
            const nextStart = parseTime(next.startDate);

            if (currentEnd > nextStart) {
                errors.push(
                    `Worker ${workerId} has overlapping assignments: ` +
                        `${current.taskId} (${current.startDate} - ${current.endDate}) overlaps with ` +
                        `${next.taskId} (${next.startDate} - ${next.endDate})`
                );
            }
        }
    });

    // Check min/max worker constraints per task
    console.log(`\n=== CHECKING TASK CONSTRAINTS ===`);
    const taskAssignments = new Map<string, Map<string, number>>();

    assignments.forEach(a => {
        if (!taskAssignments.has(a.taskId)) {
            taskAssignments.set(a.taskId, new Map());
        }

        const timeKey = `${a.startDate}|${a.endDate}`;
        const timeMap = taskAssignments.get(a.taskId)!;
        timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + 1);
    });

    tasks.forEach(task => {
        const timeMap = taskAssignments.get(task.taskId);
        if (!timeMap) return;

        timeMap.forEach((workerCount, timeKey) => {
            if (task.minWorkers && workerCount < task.minWorkers) {
                warnings.push(
                    `Task ${task.taskId} has ${workerCount} workers at ${timeKey}, but requires min ${task.minWorkers}`
                );
            }

            if (task.maxWorkers && workerCount > task.maxWorkers) {
                errors.push(
                    `Task ${task.taskId} has ${workerCount} workers at ${timeKey}, but max is ${task.maxWorkers}`
                );
            }
        });
    });

    console.log(`\n=== VERIFICATION SUMMARY ===`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
        console.log('\n❌ ERRORS:');
        errors.forEach(e => console.log(`  - ${e}`));
    }

    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(w => console.log(`  - ${w}`));
    }

    if (errors.length === 0 && warnings.length === 0) {
        console.log('\n✅ All checks passed!');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        stats: {
            totalAssignments: assignments.length,
            shift1Assignments: shift1Assignments.length,
            shift2Assignments: shift2Assignments.length,
            shift1Hours,
            shift2Hours,
            shift1Pct: actualShift1Pct,
            shift2Pct: actualShift2Pct
        }
    };
}

// Main execution
const inputFile = path.resolve(__dirname, '../Worker-Task algo data.xlsx');
const resultsFile = path.resolve(__dirname, '../Multi-shift-resulta.xlsx');

verifyMultiShiftResults(inputFile, resultsFile, 0.75, 0.25)
    .then(result => {
        console.log('\n=== FINAL RESULT ===');
        console.log('Valid:', result.isValid ? '✅' : '❌');
        process.exit(result.isValid ? 0 : 1);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
