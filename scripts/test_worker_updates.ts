// @ts-nocheck
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:8080';
const INPUT_FILE = path.resolve(__dirname, '..', 'Worker-Task algo data.xlsx');

async function testWorkerUpdates() {
    console.log('=== Testing Worker Availability Updates (KAN-405) ===\n');

    // 1. Initial Plan (Using Multi-Shift endpoint to ensure Persistence)
    console.log('1. Generating Initial Plan...');
    const planDate = '2024-05-20';
    const startTime = `${planDate}T07:00:00Z`;
    const endTime = `${planDate}T17:00:00Z`;

    const formData = new FormData();
    formData.append('file', fs.createReadStream(INPUT_FILE));
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);
    // Multi-shift specific requirements to trigger persistence
    formData.append('shift1StartTime', startTime);
    formData.append('shift1EndTime', endTime);
    formData.append('startingShiftPct', '1.0'); // 100% Shift 1
    formData.append('endingShiftPct', '0.0');

    const planRes = await fetch(`${API_URL}/api/v1/worker-tasks/plan-file-multishift-shiftids`, {
        method: 'POST',
        body: formData as any
    });

    if (!planRes.ok) throw new Error(`Plan failed: ${await planRes.text()}`);
    const plan: any = await planRes.json();
    console.log(`✓ Plan generated. ID: ${plan.planId}`);

    // Ensure we have assignments
    if (!plan.assignments || plan.assignments.length === 0) {
        throw new Error('No assignments generated in initial plan.');
    }

    // 2. Select Workers to Update
    // Pick two workers with assignments
    const workersWithTasks = new Set(plan.assignments.map((a: any) => a.workerId));
    const workerIds = Array.from(workersWithTasks).filter(id => id);

    if (workerIds.length < 2) throw new Error('Not enough workers with tasks to test.');

    const lateWorkerId = workerIds[0];
    const noShowWorkerId = workerIds[1];

    console.log(`  Late Worker: ${lateWorkerId} (Will arrive at 10:00)`);
    console.log(`  No-Show Worker: ${noShowWorkerId}`);

    // 3. Send Adjustment Request
    console.log('\n2. Sending Worker Updates...');

    // Late Worker: Arrives at 10:00
    const lateStart = `${planDate}T10:00:00Z`;

    // No Show Worker: Available only for 1 second at start (effectively no show)
    const noShowStart = startTime;
    const noShowEnd = startTime;

    const payload = {
        currentTime: startTime, // Planning from start again, but with new constraints? 
        // Or correcting mid-shift? Let's say we know this at 07:00.
        updates: [],
        workerUpdates: [
            {
                workerId: lateWorkerId,
                availability: { startTime: lateStart, endTime: endTime }
            },
            {
                workerId: noShowWorkerId,
                availability: { startTime: noShowStart, endTime: noShowEnd }
            }
        ]
    };

    const adjustRes = await fetch(`${API_URL}/api/v1/plans/${plan.planId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!adjustRes.ok) throw new Error(`Adjustment failed: ${await adjustRes.text()}`);
    const diff: any = await adjustRes.json();
    console.log('✓ Adjustment applied successfully.');

    // 4. Verify Results
    console.log('\n3. Verifying Results...');
    let passed = true;

    // Verify No-Show Worker
    // Should verify that ALL original tasks for this worker are in 'removedWorkerTasks' 
    // AND NO tasks are in 'addedWorkerTasks' (or if added, they respect the constraint?)
    // Actually, "added" tasks usually replace removed ones. 
    // If no-show, they should have NO tasks in the final state.

    // Check removed
    const removedNoShow = diff.removedWorkerTasks.filter((t: any) => t.workerId === noShowWorkerId);
    console.log(`  No-Show Worker removals: ${removedNoShow.length}`);

    // Check added
    const addedNoShow = diff.addedWorkerTasks.filter((t: any) => t.workerId === noShowWorkerId);
    if (addedNoShow.length > 0) {
        console.log(`  ❌ FAIL: No-Show worker ${noShowWorkerId} was assigned new tasks!`);
        passed = false;
    } else {
        console.log(`  ✓ No-Show worker has 0 new assignments.`);
    }

    // Verify Late Worker
    // Check added tasks for Late Worker don't start before 10:00
    const addedLate = diff.addedWorkerTasks.filter((t: any) => t.workerId === lateWorkerId);
    const earlyAssignments = addedLate.filter((t: any) => {
        return new Date(t.startDate).getTime() < new Date(lateStart).getTime();
    });

    if (earlyAssignments.length > 0) {
        console.log(`  ❌ FAIL: Late worker ${lateWorkerId} assigned tasks before 10:00!`);
        earlyAssignments.forEach((t: any) => console.log(`     - Task ${t.taskId} starts at ${t.startDate}`));
        passed = false;
    } else {
        console.log(`  ✓ Late worker assignments all start after 10:00.`);
    }

    // Check Updated Tasks (Shifted)
    // Sometimes tasks are "updated" instead of removed/added if ID matches?
    // The current logic usually removes and re-adds if significant change, or updates if just time shift.
    const updatedLate = diff.updatedWorkerTasks.filter((t: any) => t.workerId === lateWorkerId);
    const earlyUpdates = updatedLate.filter((t: any) => {
        return new Date(t.startDate).getTime() < new Date(lateStart).getTime();
    });

    if (earlyUpdates.length > 0) {
        console.log(`  ❌ FAIL: Late worker ${lateWorkerId} has updated tasks starting before 10:00!`);
        passed = false;
    }

    if (passed) {
        console.log('\n✅ TEST PASSED');
    } else {
        console.log('\n❌ TEST FAILED');
        process.exit(1);
    }
}

testWorkerUpdates().catch(err => {
    console.error(err);
    process.exit(1);
});
