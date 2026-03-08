/**
 * Test: Department-Wise Scheduling
 * 
 * Verifies that workers are correctly filtered and scored
 * based on department matching in both hard and soft modes.
 */

import { PlanningService } from '../src/services/planningService';
import { Worker, Task, PlanRequest } from '../src/types';

// ── Test Data ────────────────────────────────────────────────

const DEPT_A = 'dept-assembly';
const DEPT_B = 'dept-paint';

const baseTime = new Date('2025-06-01T08:00:00Z');
const endTime = new Date('2025-06-01T16:00:00Z');

const workers: Worker[] = [
    { workerId: 'w1', name: 'Alice (Assembly)', departmentId: DEPT_A, preferences: {} },
    { workerId: 'w2', name: 'Bob (Assembly)', departmentId: DEPT_A, preferences: {} },
    { workerId: 'w3', name: 'Carol (Paint)', departmentId: DEPT_B, preferences: {} },
    { workerId: 'w4', name: 'Dave (Paint)', departmentId: DEPT_B, preferences: {} },
    { workerId: 'w5', name: 'Eve (No Dept)', preferences: {} },  // No department
];

const tasks: Task[] = [
    {
        taskId: 't-asm-1',
        name: 'Frame Assembly',
        departmentId: DEPT_A,
        estimatedTotalLaborHours: 4,
        maxWorkers: 3,
        minWorkers: 1,
    },
    {
        taskId: 't-paint-1',
        name: 'First Coat',
        departmentId: DEPT_B,
        estimatedTotalLaborHours: 4,
        maxWorkers: 3,
        minWorkers: 1,
    },
    {
        taskId: 't-general',
        name: 'General Cleanup',
        // No department — should be assignable to anyone
        estimatedTotalLaborHours: 2,
        maxWorkers: 5,
        minWorkers: 1,
    },
];

// ── Helpers ──────────────────────────────────────────────────

function analyzeAssignments(
    assignments: Array<{ workerId?: string | null; taskId?: string | null }>,
    workerMap: Map<string, Worker>,
    taskMap: Map<string, Task>
) {
    let sameCount = 0;
    let crossCount = 0;
    let unknownCount = 0;

    const details: string[] = [];

    for (const a of assignments) {
        if (!a.workerId || !a.taskId) continue;
        const worker = workerMap.get(a.workerId);
        const task = taskMap.get(a.taskId);
        if (!worker || !task) continue;

        const wDept = worker.departmentId || '(none)';
        const tDept = task.departmentId || '(none)';

        if (!worker.departmentId || !task.departmentId) {
            unknownCount++;
        } else if (worker.departmentId === task.departmentId) {
            sameCount++;
        } else {
            crossCount++;
            details.push(`  ❌ ${worker.name} [${wDept}] → ${task.name} [${tDept}]`);
        }
    }

    return { sameCount, crossCount, unknownCount, details };
}

// ── Test Runner ──────────────────────────────────────────────

async function runTest() {
    const planner = new PlanningService();
    const workerMap = new Map(workers.map(w => [w.workerId, w]));
    const taskMap = new Map(tasks.map(t => [t.taskId, t]));

    console.log('═══════════════════════════════════════════════════');
    console.log('  Department-Wise Scheduling — Verification Test');
    console.log('═══════════════════════════════════════════════════\n');

    console.log(`Workers: ${workers.map(w => `${w.name}[${w.departmentId || 'none'}]`).join(', ')}`);
    console.log(`Tasks:   ${tasks.map(t => `${t.name}[${t.departmentId || 'none'}]`).join(', ')}\n`);

    let allPassed = true;

    // ── TEST 1: Hard Enforcement (enforceDepartmentMatch = true) ──

    console.log('────────────────────────────────────────────────────');
    console.log('TEST 1: Hard Enforcement (enforceDepartmentMatch = true)');
    console.log('────────────────────────────────────────────────────\n');

    const hardRequest: PlanRequest = {
        workers: JSON.parse(JSON.stringify(workers)),  // Deep copy
        tasks: JSON.parse(JSON.stringify(tasks)),
        interval: { startTime: baseTime.toISOString(), endTime: endTime.toISOString() },
        useHistorical: false,
        enforceDepartmentMatch: true,
    };

    const hardResult = planner.plan(hardRequest);
    const hardAssignments = hardResult || [];

    console.log(`  Total assignments: ${hardAssignments.length}`);

    const hardAnalysis = analyzeAssignments(hardAssignments, workerMap, taskMap);

    console.log(`  Same-department assignments:    ${hardAnalysis.sameCount}`);
    console.log(`  Cross-department assignments:   ${hardAnalysis.crossCount}`);
    console.log(`  No-department (either side):    ${hardAnalysis.unknownCount}\n`);

    if (hardAnalysis.crossCount > 0) {
        console.log('  ❌ FAIL: Cross-department assignments found in hard mode!\n');
        hardAnalysis.details.forEach(d => console.log(d));
        allPassed = false;
    } else {
        console.log('  ✅ PASS: Zero cross-department assignments in hard mode.\n');
    }

    // Show who got assigned to what
    const hardByTask = new Map<string, string[]>();
    for (const a of hardAssignments) {
        if (!a.taskId || !a.workerId) continue;
        if (!hardByTask.has(a.taskId)) hardByTask.set(a.taskId, []);
        if (!hardByTask.get(a.taskId)!.includes(a.workerId)) {
            hardByTask.get(a.taskId)!.push(a.workerId);
        }
    }
    for (const [taskId, workerIds] of hardByTask) {
        const task = taskMap.get(taskId);
        const names = workerIds.map(id => workerMap.get(id)?.name || id);
        console.log(`  ${task?.name || taskId}: ${names.join(', ')}`);
    }

    // Verify Assembly task only has Assembly workers
    const asmWorkers = hardByTask.get('t-asm-1') || [];
    const asmCorrect = asmWorkers.every(wId => {
        const w = workerMap.get(wId);
        return !w?.departmentId || w.departmentId === DEPT_A;
    });

    const paintWorkers = hardByTask.get('t-paint-1') || [];
    const paintCorrect = paintWorkers.every(wId => {
        const w = workerMap.get(wId);
        return !w?.departmentId || w.departmentId === DEPT_B;
    });

    console.log(`\n  Assembly task has only Assembly workers: ${asmCorrect ? '✅' : '❌'}`);
    console.log(`  Paint task has only Paint workers:       ${paintCorrect ? '✅' : '❌'}`);

    if (!asmCorrect || !paintCorrect) allPassed = false;

    // ── TEST 2: Soft Mode (enforceDepartmentMatch = false) ──

    console.log('\n────────────────────────────────────────────────────');
    console.log('TEST 2: Soft Mode (enforceDepartmentMatch = false)');
    console.log('────────────────────────────────────────────────────\n');

    const softRequest: PlanRequest = {
        workers: JSON.parse(JSON.stringify(workers)),
        tasks: JSON.parse(JSON.stringify(tasks)),
        interval: { startTime: baseTime.toISOString(), endTime: endTime.toISOString() },
        useHistorical: false,
        enforceDepartmentMatch: false,
    };

    const softResult = planner.plan(softRequest);
    const softAssignments = softResult || [];

    console.log(`  Total assignments: ${softAssignments.length}`);

    const softAnalysis = analyzeAssignments(softAssignments, workerMap, taskMap);

    console.log(`  Same-department assignments:    ${softAnalysis.sameCount}`);
    console.log(`  Cross-department assignments:   ${softAnalysis.crossCount}`);
    console.log(`  No-department (either side):    ${softAnalysis.unknownCount}\n`);

    // In soft mode, cross-department is allowed but same-department should be preferred
    if (softAnalysis.sameCount > 0) {
        console.log('  ✅ PASS: Same-department assignments present (soft scoring works).\n');
    } else {
        console.log('  ⚠️  No same-department assignments — soft scoring may not be effective.\n');
    }

    // ── TEST 3: No Department Data (should work without crashes) ──

    console.log('────────────────────────────────────────────────────');
    console.log('TEST 3: No Department Data (graceful fallback)');
    console.log('────────────────────────────────────────────────────\n');

    const noDeptWorkers: Worker[] = [
        { workerId: 'w10', name: 'No-Dept Worker 1', preferences: {} },
        { workerId: 'w11', name: 'No-Dept Worker 2', preferences: {} },
    ];

    const noDeptTasks: Task[] = [
        {
            taskId: 't-nodept-1',
            name: 'Generic Task',
            estimatedTotalLaborHours: 2,
            maxWorkers: 2,
            minWorkers: 1,
        },
    ];

    const noDeptRequest: PlanRequest = {
        workers: noDeptWorkers,
        tasks: noDeptTasks,
        interval: { startTime: baseTime.toISOString(), endTime: endTime.toISOString() },
        useHistorical: false,
        enforceDepartmentMatch: true, // Hard mode, but nobody has departments
    };

    try {
        const noDeptResult = planner.plan(noDeptRequest);
        const noDeptAssignments = noDeptResult || [];
        console.log(`  Total assignments: ${noDeptAssignments.length}`);
        if (noDeptAssignments.length > 0) {
            console.log('  ✅ PASS: Scheduling works even without department data.\n');
        } else {
            console.log('  ⚠️  No assignments generated — tasks may be too small or workers unavailable.\n');
        }
    } catch (err: any) {
        console.log(`  ❌ FAIL: Crashed when no department data present: ${err.message}\n`);
        allPassed = false;
    }

    // ── FINAL VERDICT ──

    console.log('\n═══════════════════════════════════════════════════');
    if (allPassed) {
        console.log('  ✅ ALL TESTS PASSED');
    } else {
        console.log('  ❌ SOME TESTS FAILED');
    }
    console.log('═══════════════════════════════════════════════════\n');

    if (!allPassed) process.exit(1);
}

runTest().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
