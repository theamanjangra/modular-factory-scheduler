
import { PlanningService } from '../src/services/planningService';
import { VerificationService } from '../src/services/verificationService';
import { Worker, Task } from '../src/types';
import { aggregateSchedule } from '../src/utils/scheduleAggregator';

console.log("=== DEMO: NATURAL FAILURE SCENARIOS ===\n");

// --- SCENARIO 1: The Impossible Squeeze (Min > Max) ---
console.log("SCENARIO 1: LOGICAL IMPOSSIBILITY (Min > Max)");
console.log("Description: Management demands 5 workers (Min), but the Fire Marshal says only 4 fit (Max).");

const taskImpossible: Task = {
    taskId: 't_impossible',
    name: 'Overcrowded Room',
    minWorkers: 5, // REQUIREMENT
    maxWorkers: 4, // PHYSICAL LIMIT
    estimatedRemainingLaborHours: 4,
    requiredSkills: ['General']
};

const workersScenario1: Worker[] = Array(10).fill(null).map((_, i) => ({
    workerId: `w_${i}`,
    name: `Worker ${i}`,
    skills: ['General']
}));

const planner1 = new PlanningService();
const steps1 = planner1.plan({
    workers: workersScenario1,
    tasks: [taskImpossible],
    interval: { startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() },
    useHistorical: false
});

const result1 = aggregateSchedule(steps1);
const verify1 = new VerificationService().validateSchedule(result1, workersScenario1, [taskImpossible]);

const assignedCount1 = result1.assignments.filter(a => a.taskId === 't_impossible').length; // Actually need to check per slot, but let's see verification report.
// Note: Validation checks per-slot.

console.log(`Planner Assigned: ${assignedCount1 > 0 ? 'Workers (Capped at Max)' : 'None'}`);
if (verify1.hardConstraints.minWorkers.status === 'FAIL') {
    console.log("❌ FAILURE: MinWorkers Constraint Violated!");
    console.log(`   Verify Report: ${verify1.hardConstraints.minWorkers.violations[0]}`);
} else {
    console.log("✅ Unexpected Success (Should have failed)");
}
console.log("\n------------------------------------------------\n");


// --- SCENARIO 2: The Mutiny (Preference Deadlock) ---
console.log("SCENARIO 2: PREFERENCE DEADLOCK ('The Mutiny')");
console.log("Description: Task needs workers. Workers are free and skilled, but they ALL 'Hate' the task (Pref=4).");

const taskMutiny: Task = {
    taskId: 't_mutiny',
    name: 'Cleaning the Grease Trap',
    minWorkers: 1,
    maxWorkers: 5,
    estimatedRemainingLaborHours: 4,
    requiredSkills: ['Cleaning'] // Matching skill
};

const workersScenario2: Worker[] = Array(5).fill(null).map((_, i) => ({
    workerId: `w_mutiny_${i}`,
    name: `Reluctant Worker ${i}`,
    skills: ['Cleaning'],
    preferences: { 'Cleaning the Grease Trap': 4 } // 4 = DO NOT ASSIGN
}));

const planner2 = new PlanningService();
const steps2 = planner2.plan({
    workers: workersScenario2,
    tasks: [taskMutiny],
    interval: { startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() },
    useHistorical: false
});

const result2 = aggregateSchedule(steps2);
// Verification won't fail "assignments" because there are none.
// But the project fails because the task is completely unassigned despite resources existing.

console.log(`Available Workers: ${workersScenario2.length}`);
console.log(`Task MinWorkers: ${taskMutiny.minWorkers}`);
console.log(`Assignments Made: ${result2.assignments.length}`);

if (result2.assignments.length === 0) {
    console.log("❌ FAILURE: Task Starvation (Deadlock).");
    console.log("   Reason: All candidates filtered out by Preference logic.");
} else {
    console.log("✅ Unexpected Assignment.");
}

console.log("\n=== DEMO COMPLETE ===");
