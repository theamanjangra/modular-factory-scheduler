/**
 * Test: Department-Wise Scheduling with PRODUCTION DATA
 * 
 * Fetches real workers and tasks from the production DB,
 * runs the scheduler with enforceDepartmentMatch=true,
 * and analyzes whether department constraints hold.
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local (same pattern as src/config/db.ts)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
} else {
    dotenv.config();
}

import { PrismaClient } from '@prisma/client';
import { PlanningService } from '../src/services/planningService';
import { Worker, Task, PlanRequest } from '../src/types';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────

function analyzeAssignments(
    assignments: any[],
    workerMap: Map<string, Worker>,
    taskMap: Map<string, Task>
) {
    let sameCount = 0;
    let crossCount = 0;
    let noDeptCount = 0;
    const crossDetails: string[] = [];

    for (const a of assignments) {
        if (!a.workerId || !a.taskId) continue;
        const worker = workerMap.get(a.workerId);
        const task = taskMap.get(a.taskId);
        if (!worker || !task) continue;

        if (!worker.departmentId || !task.departmentId) {
            noDeptCount++;
        } else if (worker.departmentId === task.departmentId) {
            sameCount++;
        } else {
            crossCount++;
            if (crossDetails.length < 10) { // Cap details at 10
                crossDetails.push(`    ${worker.name} [${worker.departmentId}] → ${task.name} [${task.departmentId}]`);
            }
        }
    }

    return { sameCount, crossCount, noDeptCount, crossDetails };
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Department Scheduling — PRODUCTION DATA Test');
    console.log('═══════════════════════════════════════════════════════\n');

    // ── 1. Fetch Workers ─────────────────────────────────────

    console.log('Fetching workers from production DB...');
    const dbWorkers = await prisma.worker.findMany({
        include: {
            shift: true,
            workerDepartments: { include: { department: true } }
        }
    });

    const workers: Worker[] = dbWorkers.map(w => {
        const shiftStart = w.shift?.startTime;
        const shiftEnd = w.shift?.endTime;
        const primaryDept = (w.workerDepartments as any[])?.find((wd: any) => wd.isLead) || w.workerDepartments?.[0];
        return {
            workerId: w.id,
            name: `${w.firstName || ''} ${w.lastName || ''}`.trim(),
            departmentId: primaryDept?.department?.id || undefined,
            availability: (shiftStart && shiftEnd) ? {
                startTime: shiftStart.toISOString(),
                endTime: shiftEnd.toISOString()
            } : undefined
        };
    });

    const workersWithDept = workers.filter(w => w.departmentId);
    const workersNoDept = workers.filter(w => !w.departmentId);

    console.log(`  Total workers:           ${workers.length}`);
    console.log(`  Workers WITH department: ${workersWithDept.length}`);
    console.log(`  Workers NO department:   ${workersNoDept.length}`);

    // Show department breakdown
    const deptCounts = new Map<string, { count: number; name: string }>();
    for (const w of dbWorkers) {
        const primaryDept = (w.workerDepartments as any[])?.find((wd: any) => wd.isLead) || w.workerDepartments?.[0];
        const deptId = primaryDept?.department?.id || '(none)';
        const deptName = primaryDept?.department?.name || '(none)';
        const entry = deptCounts.get(deptId) || { count: 0, name: deptName };
        entry.count++;
        deptCounts.set(deptId, entry);
    }
    console.log('\n  Department Breakdown:');
    for (const [id, info] of deptCounts) {
        console.log(`    ${info.name} (${id.substring(0, 8)}…): ${info.count} workers`);
    }

    // ── 2. Fetch Tasks ───────────────────────────────────────

    console.log('\nFetching tasks from production DB...');
    const travelers = await prisma.traveler.findMany({
        where: { isShipped: false },
        include: {
            tasks: {
                where: { leadStatus: 'pending' },
                include: {
                    taskTemplate: {
                        include: {
                            department: true,
                            prerequisiteTaskTemplate: true
                        }
                    }
                }
            },
            moduleProfile: true
        }
    });

    const templateToTaskIds = new Map<string, string[]>();
    const tasks: Task[] = [];

    for (const t of travelers) {
        for (const task of t.tasks) {
            const tmpl = task.taskTemplate;
            const taskId = task.id;

            if (!templateToTaskIds.has(tmpl.id)) {
                templateToTaskIds.set(tmpl.id, []);
            }
            templateToTaskIds.get(tmpl.id)!.push(taskId);

            tasks.push({
                taskId,
                name: `${tmpl.name}${t.moduleProfile?.name ? ' - ' + t.moduleProfile.name : ''}`,
                departmentId: (tmpl as any).departmentId || undefined,
                estimatedTotalLaborHours: (tmpl as any).nonWorkerTaskDuration || 4.0,
                maxWorkers: tmpl.maxWorkers || 2,
                minWorkers: tmpl.minWorkers || 1,
                taskType: (tmpl.taskType as any) || 'default',
                nonWorkerTaskDuration: (tmpl as any).nonWorkerTaskDuration || undefined,
                prerequisiteTaskIds: []
            });
        }
    }

    // Resolve prerequisites
    for (const task of tasks) {
        const tmplId = [...templateToTaskIds.entries()].find(([, ids]) => ids.includes(task.taskId))?.[0];
        // Find the traveler task to get prerequisiteTaskTemplateId
        for (const t of travelers) {
            for (const dbTask of t.tasks) {
                if (dbTask.id === task.taskId && dbTask.taskTemplate.prerequisiteTaskTemplateId) {
                    const prereqIds = templateToTaskIds.get(dbTask.taskTemplate.prerequisiteTaskTemplateId);
                    if (prereqIds) {
                        task.prerequisiteTaskIds = prereqIds;
                    }
                }
            }
        }
    }

    const tasksWithDept = tasks.filter(t => t.departmentId);
    const tasksNoDept = tasks.filter(t => !t.departmentId);

    console.log(`  Total tasks:            ${tasks.length}`);
    console.log(`  Tasks WITH department:  ${tasksWithDept.length}`);
    console.log(`  Tasks NO department:    ${tasksNoDept.length}`);

    // Show task department breakdown
    const taskDeptCounts = new Map<string, number>();
    for (const t of tasks) {
        const key = t.departmentId || '(none)';
        taskDeptCounts.set(key, (taskDeptCounts.get(key) || 0) + 1);
    }
    console.log('\n  Task Department Breakdown:');
    for (const [deptId, count] of taskDeptCounts) {
        const deptInfo = deptCounts.get(deptId);
        console.log(`    ${deptInfo?.name || deptId.substring(0, 8) + '…'}: ${count} tasks`);
    }

    // Cap tasks for practical runtime — take a diverse sample across departments
    const MAX_TASKS = 50;
    if (tasks.length > MAX_TASKS) {
        console.log(`\n  ⚠ Capping to ${MAX_TASKS} tasks for runtime (from ${tasks.length})`);
        // Take proportional sample from each department
        const sampledTasks: Task[] = [];
        const deptGroups = new Map<string, Task[]>();
        for (const t of tasks) {
            const key = t.departmentId || '(none)';
            if (!deptGroups.has(key)) deptGroups.set(key, []);
            deptGroups.get(key)!.push(t);
        }
        // Allocate proportionally, min 1 per dept
        const deptKeys = Array.from(deptGroups.keys());
        let remaining = MAX_TASKS;
        for (const key of deptKeys) {
            const group = deptGroups.get(key)!;
            const share = Math.max(1, Math.round((group.length / tasks.length) * MAX_TASKS));
            const take = Math.min(share, remaining, group.length);
            sampledTasks.push(...group.slice(0, take));
            remaining -= take;
            if (remaining <= 0) break;
        }
        tasks.length = 0;
        tasks.push(...sampledTasks);
        console.log(`  Sampled ${tasks.length} tasks across ${deptKeys.length} departments`);
    }

    if (workers.length === 0 || tasks.length === 0) {
        console.log('\n⚠️  No workers or tasks found — cannot run scheduler.');
        await prisma.$disconnect();
        return;
    }

    // ── 3. Run Scheduler ─────────────────────────────────────

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 0);

    // Override availability if shifts are in the past
    const schedulerWorkers = workers.map(w => ({
        ...w,
        availability: {
            startTime: now.toISOString(),
            endTime: endOfDay.toISOString()
        }
    }));

    const workerMap = new Map(schedulerWorkers.map(w => [w.workerId, w]));
    const taskMap = new Map(tasks.map(t => [t.taskId, t]));

    // ── 3a. Hard Mode ────────────────────────────────────────

    console.log('\n────────────────────────────────────────────────────');
    console.log('SCHEDULING: Hard Enforcement (enforceDepartmentMatch = true)');
    console.log('────────────────────────────────────────────────────\n');

    const planner = new PlanningService();
    const hardRequest: PlanRequest = {
        workers: JSON.parse(JSON.stringify(schedulerWorkers)),
        tasks: JSON.parse(JSON.stringify(tasks)),
        interval: { startTime: now.toISOString(), endTime: endOfDay.toISOString() },
        useHistorical: false,
        enforceDepartmentMatch: true,
    };

    const hardResult = planner.plan(hardRequest) || [];
    console.log(`  Total assignments: ${hardResult.length}`);

    const hardAnalysis = analyzeAssignments(hardResult, workerMap, taskMap);
    console.log(`  Same-department:     ${hardAnalysis.sameCount}`);
    console.log(`  Cross-department:    ${hardAnalysis.crossCount}`);
    console.log(`  No-department:       ${hardAnalysis.noDeptCount}`);

    if (hardAnalysis.crossCount > 0) {
        console.log(`\n  ❌ FAIL: ${hardAnalysis.crossCount} cross-department violations!`);
        hardAnalysis.crossDetails.forEach(d => console.log(d));
    } else {
        console.log('\n  ✅ PASS: Zero cross-department violations in hard mode.');
    }

    // ── 3b. Soft Mode ────────────────────────────────────────

    console.log('\n────────────────────────────────────────────────────');
    console.log('SCHEDULING: Soft Mode (enforceDepartmentMatch = false)');
    console.log('────────────────────────────────────────────────────\n');

    const softRequest: PlanRequest = {
        workers: JSON.parse(JSON.stringify(schedulerWorkers)),
        tasks: JSON.parse(JSON.stringify(tasks)),
        interval: { startTime: now.toISOString(), endTime: endOfDay.toISOString() },
        useHistorical: false,
        enforceDepartmentMatch: false,
    };

    const softResult = planner.plan(softRequest) || [];
    console.log(`  Total assignments: ${softResult.length}`);

    const softAnalysis = analyzeAssignments(softResult, workerMap, taskMap);
    console.log(`  Same-department:     ${softAnalysis.sameCount}`);
    console.log(`  Cross-department:    ${softAnalysis.crossCount}`);
    console.log(`  No-department:       ${softAnalysis.noDeptCount}`);

    const softSamePct = (softAnalysis.sameCount + softAnalysis.crossCount) > 0
        ? ((softAnalysis.sameCount / (softAnalysis.sameCount + softAnalysis.crossCount)) * 100).toFixed(1)
        : 'N/A';
    console.log(`  Same-dept preference: ${softSamePct}%`);

    // ── Summary ──────────────────────────────────────────────

    console.log('\n═══════════════════════════════════════════════════════');
    const allPassed = hardAnalysis.crossCount === 0;
    if (allPassed) {
        console.log('  ✅ PRODUCTION DATA TEST PASSED');
    } else {
        console.log('  ❌ PRODUCTION DATA TEST FAILED');
    }
    console.log('═══════════════════════════════════════════════════════\n');

    await prisma.$disconnect();

    if (!allPassed) process.exit(1);
}

main().catch(async err => {
    console.error('Fatal error:', err);
    await prisma.$disconnect();
    process.exit(1);
});
