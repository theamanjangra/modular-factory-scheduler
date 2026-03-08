
import { PrismaClient } from '@prisma/client';
import { MultiShiftFilePlanningService } from '../src/services/multiShiftFilePlanningService';
import { SchedulingAdapterService } from '../src/services/schedulingAdapterService'; // To map DB to External
import { Worker, Task } from '../src/types';

const prisma = new PrismaClient();

async function main() {
    const adapter = new SchedulingAdapterService();
    const service = new MultiShiftFilePlanningService();

    // 1. Fetch Data
    const workersDB = await prisma.worker.findMany({ include: { workerDepartments: true } });
    const tasksDB = await prisma.task.findMany({
        include: { taskTemplate: { include: { timeStudies: true } } }
    });

    // 2. Map to External Types
    // (Simplified mapping for debug)
    const workers: any[] = workersDB.map(w => ({
        workerId: w.id,
        name: w.name,
        shiftPreference: 'shift-1',
        skills: {},
        availability: undefined
    }));

    const tasks: any[] = tasksDB.map(t => ({
        taskId: t.id,
        name: t.taskTemplate.name,
        estimatedTotalLaborHours: (t.taskTemplate.timeStudies[0]?.clockTime || 4.0),
        estimatedRemainingLaborHours: (t.taskTemplate.timeStudies[0]?.clockTime || 4.0),
        minWorkers: 1,
        maxWorkers: 2,
        requiredSkills: {},
        taskType: 'default',
        earliestStartDate: undefined,
        prerequisiteTaskIds: []
    }));

    console.log(`Loaded ${workers.length} workers and ${tasks.length} tasks.`);

    // 3. Setup Request
    const today = new Date().toISOString().split('T')[0];
    // Use factory timezone offset if needed, but simplified UTC is fine for debug script logic
    const s1Start = `${today}T07:00:00.000Z`;
    const s1End = `${today}T15:00:00.000Z`;
    const s2Start = `${today}T15:00:00.000Z`;
    const s2End = `${today}T23:00:00.000Z`;

    const request = {
        workers,
        tasks,
        shift1Interval: { startTime: s1Start, endTime: s1End },
        shift2Interval: { startTime: s2Start, endTime: s2End },
        startingShiftPct: 0.75,
        endingShiftPct: 0.25,
        scheduling: {
            minAssignmentMinutes: 30,
            timeStepMinutes: 5,
            transitionGapMs: 0
        }
    };

    // 4. Run Plan
    const result = await service.plan(request as any);

    // 5. Analyze Results
    console.log(`\n--- ANALYSIS ---`);
    console.log(`Total Assignments: ${result.assignments.length}`);

    // Group by time
    const timeSlots = new Map<string, number>();
    result.assignments.forEach(a => {
        if (!a.workerId) return; // Skip virtual/idle
        if (a.isWaitTask) return;

        const key = a.startDate.substring(11, 16); // HH:MM
        timeSlots.set(key, (timeSlots.get(key) || 0) + 1);
    });

    console.log(`Active Assignments by Time (Sample):`);
    const sortedTimes = Array.from(timeSlots.keys()).sort();
    sortedTimes.forEach(t => {
        console.log(`${t}: ${timeSlots.get(t)} workers active`);
    });

    // Check specific tasks
    const t1 = tasks[0];
    const t1Assignments = result.assignments.filter(a => a.taskId === t1.taskId);
    console.log(`\nTask ${t1.name} Assignments:`);
    t1Assignments.forEach(a => console.log(`${a.startDate} - ${a.endDate} (${a.workerId || 'Virtual'})`));

}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
