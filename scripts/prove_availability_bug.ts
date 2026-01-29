import { PlanningService } from '../src/services/planningService';
import { VerificationService } from '../src/services/verificationService';
import { Worker, Task } from '../src/types';

// 1. Worker available ONLY Morning (08:00 - 12:00)
const worker: Worker = {
    workerId: 'w_morning',
    name: 'Morning Star',
    skills: ['General'],
    availability: {
        startTime: '2025-05-01T08:00:00.000Z',
        endTime: '2025-05-01T12:00:00.000Z'
    }
};

// 2. Task requests Afternoon (13:00 - 17:00) implicitly via planning interval
const task: Task = {
    taskId: 't_afternoon',
    name: 'Afternoon Delight',
    requiredSkills: ['General'],
    minWorkers: 1,
    maxWorkers: 1,
    estimatedRemainingLaborHours: 4
};

// 3. Plan for Afternoon (13:00 - 17:00)
const start = '2025-05-01T13:00:00.000Z';
const end = '2025-05-01T17:00:00.000Z';

console.log("--- PROVING AVAILABILITY BLINDNESS ---");
console.log(`Worker Availability: ${worker.availability?.startTime} - ${worker.availability?.endTime}`);
console.log(`Planning Interval:   ${start} - ${end}`);

const planner = new PlanningService();
const rawSteps = planner.plan({
    workers: [worker],
    tasks: [task],
    interval: { startTime: start, endTime: end },
    useHistorical: false
});

console.log(`\nPlanner generated ${rawSteps.length} steps.`);
if (rawSteps.length > 0) {
    console.log("❌ BUG CONFIRMED: Planner assigned worker OUTSIDE availability!");
    console.log(`   Assignment: ${rawSteps[0].startDate} - ${rawSteps[0].endDate}`);
} else {
    console.log("✅ Planner respected availability (Bug not present).");
}
