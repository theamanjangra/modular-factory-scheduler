
import { PlanAdjustmentService } from '../src/services/planAdjustmentService';
import { Task, Worker, CurrentAssignment, WorkerTask } from '../src/types';

const timeStr = (hours: number, minutes: number = 0) => {
    const d = new Date('2024-01-01T00:00:00Z');
    d.setUTCHours(hours, minutes, 0, 0);
    return d.toISOString();
};

async function runTest() {
    console.log('--- TEST CASE: Adjustment Service Cascading Wait ---');
    console.log('Scenario: Task A (Done) -> Wait B (4h) -> Wait C (2h) -> Task D (Labor)');
    console.log('Current Time: 19:30. Wait B (Started 15:30) Ends NOW at 19:30.');
    console.log('Expected: Wait C should start at 19:30. Task D at 21:30.');

    // 1. Setup Data
    const workers: Worker[] = [{
        workerId: 'w1', name: 'Worker 1',
        availability: { startTime: timeStr(6, 30), endTime: timeStr(23, 30) }
    }];

    const tasks: Task[] = [
        { taskId: 'A', name: 'Task A (Done)', estimatedTotalLaborHours: 0, estimatedRemainingLaborHours: 0 },
        { taskId: 'B', name: 'Wait B', nonWorkerTaskDuration: 4, prerequisiteTaskIds: ['A'] }, // Removed taskType, implicit wait
        { taskId: 'C', name: 'Wait C', nonWorkerTaskDuration: 2, prerequisiteTaskIds: ['B'] }, // Removed taskType, implicit wait
        { taskId: 'D', name: 'Task D', estimatedTotalLaborHours: 1, minWorkers: 1, prerequisiteTaskIds: ['C'] }
    ];

    // 2. Setup State
    // Task A is complete.
    // Wait B started at 15:30.
    // Current Time is 19:30.
    const currentTimeStr = timeStr(19, 30); // 19:30

    // We need to inject "waitStartTime" potentially?
    // PlanAdjustmentService re-computes state.
    // But it doesn't know about "Wait Start Time" from memory unless we provide "Current Assignments"?
    // "Wait B" is a wait task. Usually not in "Current Assignments" (WorkerTask).
    // HOWEVER, if we say Wait B is "In Progress", how does it know?
    // It filters "incomplete".
    // If we map tasks...

    // In `planWithPenalty`, it builds `taskState` from `allTasks`.
    // It initializes `remainingHours` from `estimatedTotalLaborHours` (if remaining is null).
    // Wait B: Total 4. Remaining?
    // If we say Remaining is 0? Then it's complete.
    // If we say Remaining is 4? Then it starts NOW.

    // Problem: AdjustService is stateless regarding "Wait Start Time" unless we tell it.
    // If Wait B started at 15:30. At 19:30 it is DONE.
    // So we should mark B as Complete in the input `allTasks`?
    // If B is complete, then C becomes ready.

    // User Scenario: "Dry Time 4 hours starting at 15:30... dependent task starts at 19:30".
    // If Replanning at 19:30.
    // Logic should see B is Done?
    // Or if Replanning at 17:30? B is Mid-way.

    // Let's test the "Cascading Wait" logic specifically (Wait C -> Wait D).
    // Let's say B is COMPLETE. C is READY.
    // C is 2 hours. Start 19:30.
    // D is Labor. Start 21:30.

    // If my fix works, C (Wait) will start at 19:30 and finish at 21:30 in one go (or steps).
    // D will start at 21:30.

    // If fix fails, C starts 19:30.
    // At 20:00 (Next step), C continues... 
    // Wait, `planWithPenalty` logic loops steps internally.
    // The "Gap" happens if we skip a step.

    // Wait, the "Gap" bug in PlanningService was because we check "Ready" LIST once.
    // In `planWithPenalty`, we sort `incomplete`.
    // My fix adds "Wait Processing Loop".

    // Let's run it.

    // To simulate B is done:
    const tasksInput = tasks.map(t => {
        if (t.taskId === 'A') return { ...t, estimatedRemainingLaborHours: 0 };
        if (t.taskId === 'B') return { ...t, estimatedRemainingLaborHours: 0 }; // B completes
        return { ...t, estimatedRemainingLaborHours: t.estimatedTotalLaborHours ?? t.nonWorkerTaskDuration };
    });

    const service = new PlanAdjustmentService();
    const result = service.planWithPenalty(
        currentTimeStr,
        tasksInput,
        workers,
        [], // No current assignments
        {},
        []
    );

    // Analyze D start time
    const dAssign = result.find(a => a.taskId === 'D');

    console.log('\n--- RESULTS ---');
    if (!dAssign) {
        console.log('Task D not assigned.');
    } else {
        const startStr = new Date(dAssign.startDate).toISOString().substr(11, 5);
        console.log(`Task D Start: ${startStr}`);

        // C should take 2 hours (19:30 -> 21:30).
        // D should start 21:30.
        if (startStr === '21:30') {
            console.log('✅ PASS: Task D starts immediately after Wait C.');
        } else {
            console.log(`❌ FAIL: Expected 21:30, got ${startStr}`);
        }
        // 3. Verify Diff
        // We need to simulate diff generation.
        // Original Assignments (empty for simplicity? Or dummy past assignments)
        // New Assignments: result

        // We access private method? No, we call public method.
        // But we used `planWithPenalty` which returns assignments.

        // Let's create a dummy instance and call buildDiff if it was public... it IS public.
        const diff = service.buildDiff([], result, tasksInput);

        console.log('\n--- DIFF CHECK ---');
        const addedWaitTasks = diff.addedWorkerTasks.filter(a => a.taskId === 'C');
        if (addedWaitTasks.length > 0) {
            console.log(`✅ PASS: Diff contains ${addedWaitTasks.length} added assignments for Wait C.`);
        } else {
            console.log('❌ FAIL: Diff MISSING Wait C assignments.');
        }
    }
}

runTest();
