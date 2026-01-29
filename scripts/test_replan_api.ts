/**
 * End-to-End Test Script for Plan + Replan APIs
 *
 * Usage:
 *   npx ts-node scripts/test_replan_api.ts
 *
 * This script:
 * 1. Loads Building Envelope simulation Excel → JSON
 * 2. Calls POST /api/v1/worker-tasks/plan
 * 3. Calls POST /api/v1/plans/ephemeral/adjust with changes
 * 4. Applies the diff to original assignments
 * 5. Validates and outputs a text-based Gantt chart
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PlanningService } from '../src/services/planningService';
import { PlanAdjustmentService } from '../src/services/planAdjustmentService';
import { aggregateSchedule } from '../src/utils/scheduleAggregator';

// ============================================
// CONFIGURATION
// ============================================
const BASE_URL = 'http://localhost:3000';
const USE_IN_PROCESS = process.env.USE_IN_PROCESS === '1';
const EXCEL_FILE = path.resolve(__dirname, '../Building Envelope-simulation.xlsx');

// ============================================
// TYPES (matching API)
// ============================================
interface Worker {
    workerId: string;
    name: string;
    availability?: { startTime: string; endTime: string };
    preferences?: Record<string, number>;
}

interface Task {
    taskId: string;
    name?: string;
    estimatedTotalLaborHours?: number;
    estimatedRemainingLaborHours?: number;
    minWorkers?: number;
    maxWorkers?: number;
    prerequisiteTaskIds?: string[];
    shiftCompletionPreference?: string;
}

interface WorkerTask {
    workerId: string | null;
    taskId: string | null;
    startDate: string;
    endDate: string;
}

interface PlanRequest {
    workers: Worker[];
    tasks: Task[];
    interval: { startTime: string; endTime: string };
    useHistorical: boolean;
}

interface AdjustRequest {
    currentTime: string;
    updates: { taskId: string; laborHoursRemaining: number; interpretAs?: 'total' | 'remaining' }[];
    workerUpdates?: { workerId: string; availability: { startTime: string; endTime: string } }[];
    tasks: Task[];
    workers: Worker[];
    originalAssignments: WorkerTask[];
}

interface DiffResponse {
    addedWorkerTasks: WorkerTask[];
    removedWorkerTasks: WorkerTask[];
    updatedWorkerTasks: (WorkerTask & { previousEndDate: string })[];
    impactedTasks: { taskId: string; status: string; newEndDate?: string; previousEndDate?: string }[];
}

// ============================================
// EXCEL LOADER (simplified from excelLoader.ts)
// ============================================
function loadExcelData(filePath: string): { workers: Worker[]; tasks: Task[] } {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const workers: Worker[] = [];
    const tasks: Task[] = [];

    // Parse Workers sheet
    const workersSheet = workbook.Sheets['Workers'];
    if (workersSheet) {
        const aoa = XLSX.utils.sheet_to_json(workersSheet, { header: 1 }) as any[][];
        let headerRowIndex = aoa.findIndex(row => row && row.includes('Name'));

        if (headerRowIndex > -1) {
            const rows = XLSX.utils.sheet_to_json(workersSheet, { range: headerRowIndex });
            rows.forEach((row: any, index: number) => {
                if (!row['Name']) return;
                const preferences: Record<string, number> = {};
                Object.keys(row).forEach(key => {
                    if (key !== 'Name' && !isNaN(parseInt(row[key]))) {
                        preferences[key] = parseInt(row[key]);
                    }
                });
                workers.push({
                    workerId: `w_${index + 1}`,
                    name: row['Name'],
                    preferences
                });
            });
        }
    }

    // Parse Tasks sheet
    const tasksSheet = workbook.Sheets['Tasks'];
    if (tasksSheet) {
        const aoa = XLSX.utils.sheet_to_json(tasksSheet, { header: 1 }) as any[][];
        let headerRowIndex = aoa.findIndex(row => row && row.includes('TaskName'));

        if (headerRowIndex > -1) {
            const rows = XLSX.utils.sheet_to_json(tasksSheet, { range: headerRowIndex });
            rows.forEach((row: any, index: number) => {
                if (!row['TaskName']) return;

                const laborHours = Number(row['LaborHoursRemaining']) || 0;
                const minWorkers = !isNaN(Number(row['MinWorkers'])) ? Number(row['MinWorkers']) : 1;
                const maxWorkers = !isNaN(Number(row['MaxWorkers'])) ? Number(row['MaxWorkers']) : 1;

                let shiftPref: string | undefined;
                const prefNum = Number(row['ShiftPreference']);
                if (prefNum === 3) shiftPref = 'mustCompleteWithinShift';
                else if (prefNum === 2) shiftPref = 'prefersCompleteWithinShift';
                else if (prefNum === 1) shiftPref = 'doesNotMatter';

                tasks.push({
                    taskId: `t_${index + 1}`,
                    name: row['TaskName'],
                    estimatedTotalLaborHours: laborHours,
                    estimatedRemainingLaborHours: laborHours,
                    minWorkers,
                    maxWorkers,
                    prerequisiteTaskIds: [],
                    shiftCompletionPreference: shiftPref
                });
            });

            // Second pass: prerequisites
            const taskNameMap = new Map(tasks.map(t => [t.name, t.taskId]));
            rows.forEach((row: any, index: number) => {
                if (row['PrerequisiteTask'] && tasks[index]) {
                    const prereqId = taskNameMap.get(row['PrerequisiteTask']);
                    if (prereqId) tasks[index].prerequisiteTaskIds = [prereqId];
                }
            });
        }
    }

    return { workers, tasks };
}

// ============================================
// HELPER: Apply Diff to Assignments
// ============================================
function applyDiffToAssignments(
    original: WorkerTask[],
    diff: DiffResponse,
    currentTime: string
): WorkerTask[] {
    const currentTimeMs = new Date(currentTime).getTime();

    // Create a map for quick lookup
    const makeKey = (a: WorkerTask) =>
        `${a.workerId}|${a.taskId}|${new Date(a.startDate).toISOString()}`;

    const removedKeys = new Set(diff.removedWorkerTasks.map(makeKey));
    const updatedMap = new Map(diff.updatedWorkerTasks.map(u => [makeKey(u), u]));

    // Start with assignments that ended before currentTime (keep history),
    // but allow "ended at currentTime" to be updated/removed.
    const pastAssignments = original.filter(a => {
        const endMs = new Date(a.endDate).getTime();
        const key = makeKey(a);
        if (endMs < currentTimeMs) return true;
        if (endMs === currentTimeMs && !removedKeys.has(key) && !updatedMap.has(key)) {
            return true;
        }
        return false;
    });

    // Get future assignments and apply changes
    const futureOriginal = original.filter(a => {
        const endMs = new Date(a.endDate).getTime();
        if (endMs > currentTimeMs) return true;
        if (endMs === currentTimeMs) {
            const key = makeKey(a);
            return removedKeys.has(key) || updatedMap.has(key);
        }
        return false;
    });

    // Filter out removed, apply updates
    const adjustedFuture = futureOriginal
        .filter(a => !removedKeys.has(makeKey(a)))
        .map(a => {
            const key = makeKey(a);
            const update = updatedMap.get(key);
            if (update) {
                return { ...a, endDate: update.endDate };
            }
            return a;
        });

    // Add new assignments
    const newAssignments = diff.addedWorkerTasks.map(a => ({
        workerId: a.workerId,
        taskId: a.taskId,
        startDate: a.startDate,
        endDate: a.endDate
    }));

    return [...pastAssignments, ...adjustedFuture, ...newAssignments];
}

// ============================================
// HELPER: Text-Based Gantt Chart
// ============================================
function printGanttChart(
    assignments: WorkerTask[],
    tasks: Task[],
    startTime: string,
    endTime: string
): void {
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const totalHours = (endMs - startMs) / (1000 * 60 * 60);
    const hourWidth = 4; // Characters per hour

    const taskMap = new Map(tasks.map(t => [t.taskId, t]));

    console.log('\n' + '='.repeat(80));
    console.log('GANTT CHART (Text-Based)');
    console.log('='.repeat(80));

    // Header (hours)
    let header = 'Task'.padEnd(20) + '|';
    for (let h = 0; h < totalHours; h++) {
        const hour = new Date(startMs + h * 60 * 60 * 1000).getUTCHours();
        header += `${hour}`.padStart(hourWidth);
    }
    console.log(header);
    console.log('-'.repeat(header.length));

    // Group by task
    const taskAssignments = new Map<string, WorkerTask[]>();
    assignments.forEach(a => {
        if (!a.taskId) return;
        if (!taskAssignments.has(a.taskId)) {
            taskAssignments.set(a.taskId, []);
        }
        taskAssignments.get(a.taskId)!.push(a);
    });

    // Print each task
    tasks.forEach(task => {
        const assigns = taskAssignments.get(task.taskId) || [];
        const taskName = (task.name || task.taskId).substring(0, 18).padEnd(20);

        let line = taskName + '|';
        for (let h = 0; h < totalHours; h++) {
            const hourStart = startMs + h * 60 * 60 * 1000;
            const hourEnd = hourStart + 60 * 60 * 1000;

            // Count workers in this hour
            const workersInHour = assigns.filter(a => {
                const aStart = new Date(a.startDate).getTime();
                const aEnd = new Date(a.endDate).getTime();
                return aStart < hourEnd && aEnd > hourStart;
            }).length;

            if (workersInHour > 0) {
                line += `[${workersInHour}]`.padStart(hourWidth);
            } else {
                line += ' '.repeat(hourWidth);
            }
        }
        console.log(line);
    });

    console.log('='.repeat(80));
    console.log('Legend: [N] = N workers assigned in that hour\n');
}

// ============================================
// HELPER: Validate Assignments
// ============================================
function validateAssignments(
    assignments: WorkerTask[],
    tasks: Task[],
    workers: Worker[]
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for double-booking
    const workerSlots = new Map<string, string[]>();
    assignments.forEach(a => {
        if (!a.workerId) return;
        const key = `${a.workerId}|${a.startDate}`;
        if (!workerSlots.has(key)) workerSlots.set(key, []);
        workerSlots.get(key)!.push(a.taskId || 'unknown');
    });

    workerSlots.forEach((taskIds, key) => {
        if (taskIds.length > 1) {
            errors.push(`Double booking: ${key} -> ${taskIds.join(', ')}`);
        }
    });

    // Check task completion
    const taskHours = new Map<string, number>();
    assignments.forEach(a => {
        if (!a.taskId) return;
        const hours = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60);
        taskHours.set(a.taskId, (taskHours.get(a.taskId) || 0) + hours);
    });

    tasks.forEach(task => {
        const worked = taskHours.get(task.taskId) || 0;
        const required = task.estimatedTotalLaborHours || 0;
        if (worked < required * 0.99) {
            errors.push(`Task ${task.name} incomplete: ${worked.toFixed(2)}h / ${required}h`);
        }
    });

    return { valid: errors.length === 0, errors };
}

// ============================================
// API CALLS
// ============================================
async function callPlanAPI(planRequest: PlanRequest): Promise<any> {
    if (USE_IN_PROCESS) {
        const planningService = new PlanningService();
        const rawSteps = planningService.plan(planRequest as any);
        const aggregated = aggregateSchedule(rawSteps);
        return {
            version: "v2-god-mode",
            ...aggregated,
            assignments: aggregated.story,
            items: aggregated.assignments
        };
    }

    const response = await fetch(`${BASE_URL}/api/v1/worker-tasks/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planRequest)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Plan API failed: ${response.status} - ${text}`);
    }

    return response.json();
}

async function callAdjustAPI(adjustRequest: AdjustRequest): Promise<DiffResponse> {
    if (USE_IN_PROCESS) {
        const service = new PlanAdjustmentService();
        return service.adjustPlanReplan(
            adjustRequest.originalAssignments as any,
            adjustRequest.tasks as any,
            adjustRequest.workers as any,
            adjustRequest as any
        );
    }

    const response = await fetch(`${BASE_URL}/api/v1/plans/ephemeral/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustRequest)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Adjust API failed: ${response.status} - ${text}`);
    }

    return response.json();
}

// ============================================
// MAIN TEST FLOW
// ============================================
async function main() {
    console.log('🚀 Starting Plan + Replan API Test\n');

    // 1. Load Excel Data
    console.log('📊 Loading Excel data...');
    if (!fs.existsSync(EXCEL_FILE)) {
        console.error(`❌ Excel file not found: ${EXCEL_FILE}`);
        process.exit(1);
    }

    const { workers, tasks } = loadExcelData(EXCEL_FILE);
    console.log(`   Found ${workers.length} workers, ${tasks.length} tasks`);

    // Set worker availability for the shift
    const startTime = '2024-01-01T07:00:00Z';
    const endTime = '2024-01-01T17:00:00Z';

    const workersWithAvailability = workers.map(w => ({
        ...w,
        availability: { startTime, endTime }
    }));

    // 2. Create Plan Request
    const planRequest: PlanRequest = {
        workers: workersWithAvailability,
        tasks,
        interval: { startTime, endTime },
        useHistorical: false
    };

    // Save request JSON for manual testing
    const requestPath = path.resolve(__dirname, '../data/building_envelope_plan_request.json');
    fs.writeFileSync(requestPath, JSON.stringify(planRequest, null, 2));
    console.log(`   Saved plan request to: ${requestPath}`);

    // 3. Call Plan API
    console.log('\n📤 Calling Plan API...');
    let planResult: any;
    try {
        planResult = await callPlanAPI(planRequest);
        console.log(`   ✅ Plan created: ${planResult.assignments?.length || 0} assignments`);
    } catch (error: any) {
        console.error(`   ❌ Plan API Error: ${error.message}`);
        console.log('\n   Make sure the server is running: npm run dev');
        process.exit(1);
    }

    // Extract assignments (handle both formats)
    const originalAssignments: WorkerTask[] = (planResult.items || planResult.assignments || [])
        .filter((a: any) => a.workerId && a.taskId);

    console.log(`   Extracted ${originalAssignments.length} valid assignments`);

    // Print original Gantt
    printGanttChart(originalAssignments, tasks, startTime, endTime);

    // Validate original
    const originalValidation = validateAssignments(originalAssignments, tasks, workers);
    if (originalValidation.valid) {
        console.log('✅ Original plan is VALID');
    } else {
        console.log('⚠️ Original plan has issues:');
        originalValidation.errors.forEach(e => console.log(`   - ${e}`));
    }

    // 4. Prepare Adjust Request (simulate task taking longer)
    console.log('\n📝 Preparing Adjust Request...');

    // Simulate: It's 10:00 AM, and first task needs 2 more hours than planned
    const currentTime = '2024-01-01T10:00:00Z';
    const taskToUpdate = tasks[0]; // First task

    if (!taskToUpdate) {
        console.log('   No tasks to update, skipping adjust test');
        return;
    }

    const newTotalHours = (taskToUpdate.estimatedTotalLaborHours || 0) + 2;
    console.log(`   Updating ${taskToUpdate.name}: ${taskToUpdate.estimatedTotalLaborHours}h → ${newTotalHours}h`);

    const adjustRequest: AdjustRequest = {
        currentTime,
        updates: [
            {
                taskId: taskToUpdate.taskId,
                laborHoursRemaining: newTotalHours,
                interpretAs: 'total'
            }
        ],
        tasks,
        workers: workersWithAvailability,
        originalAssignments
    };

    // Save adjust request for manual testing
    const adjustRequestPath = path.resolve(__dirname, '../data/building_envelope_adjust_request.json');
    fs.writeFileSync(adjustRequestPath, JSON.stringify(adjustRequest, null, 2));
    console.log(`   Saved adjust request to: ${adjustRequestPath}`);

    // 5. Call Adjust API
    console.log('\n📤 Calling Adjust API...');
    let diffResult: DiffResponse;
    try {
        diffResult = await callAdjustAPI(adjustRequest);
        console.log('   ✅ Adjust completed');
        console.log(`   Added: ${diffResult.addedWorkerTasks?.length || 0}`);
        console.log(`   Removed: ${diffResult.removedWorkerTasks?.length || 0}`);
        console.log(`   Updated: ${diffResult.updatedWorkerTasks?.length || 0}`);
        console.log(`   Impacted: ${diffResult.impactedTasks?.length || 0}`);
    } catch (error: any) {
        console.error(`   ❌ Adjust API Error: ${error.message}`);
        process.exit(1);
    }

    // 6. Apply Diff
    console.log('\n🔧 Applying diff to assignments...');
    const adjustedAssignments = applyDiffToAssignments(
        originalAssignments,
        diffResult,
        currentTime
    );
    console.log(`   Result: ${adjustedAssignments.length} assignments after adjustment`);

    // Print adjusted Gantt
    console.log('\n📊 ADJUSTED SCHEDULE:');
    printGanttChart(adjustedAssignments, tasks, startTime, endTime);

    // Validate adjusted
    const adjustedValidation = validateAssignments(adjustedAssignments, tasks, workers);
    if (adjustedValidation.valid) {
        console.log('✅ Adjusted plan is VALID');
    } else {
        console.log('⚠️ Adjusted plan has issues:');
        adjustedValidation.errors.forEach(e => console.log(`   - ${e}`));
    }

    // 7. Output summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Original assignments: ${originalAssignments.length}`);
    console.log(`Adjusted assignments: ${adjustedAssignments.length}`);
    console.log(`Diff - Added: ${diffResult.addedWorkerTasks?.length || 0}`);
    console.log(`Diff - Removed: ${diffResult.removedWorkerTasks?.length || 0}`);
    console.log(`Diff - Updated: ${diffResult.updatedWorkerTasks?.length || 0}`);

    // Save results
    const resultsPath = path.resolve(__dirname, '../data/replan_test_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
        originalAssignments,
        adjustedAssignments,
        diff: diffResult,
        validation: {
            original: originalValidation,
            adjusted: adjustedValidation
        }
    }, null, 2));
    console.log(`\nResults saved to: ${resultsPath}`);
}

// Run
main().catch(console.error);
