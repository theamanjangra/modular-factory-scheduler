/**
 * Replan API Test Case Generator
 * Generates 100+ test cases for the /api/v1/plans/:planId/adjust endpoint
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Base Fixtures
// ============================================

const BASE_DATE = '2026-01-22T07:00:00.000Z';
const SHIFT_END = '2026-01-22T21:00:00.000Z';

function isoDate(hoursFromBase: number): string {
    const d = new Date(BASE_DATE);
    d.setTime(d.getTime() + hoursFromBase * 60 * 60 * 1000);
    return d.toISOString();
}

// Simple workers for testing
function createWorkers(count: number, shiftStart = BASE_DATE, shiftEnd = SHIFT_END): any[] {
    return Array.from({ length: count }, (_, i) => ({
        workerId: `w_${i + 1}`,
        name: `Worker ${i + 1}`,
        availability: { startTime: shiftStart, endTime: shiftEnd },
        skills: ['general']
    }));
}

// Simple tasks for testing
function createTasks(specs: Array<{
    id: string;
    hours: number;
    minW?: number;
    maxW?: number;
    prereqs?: string[];
    nonWorker?: boolean;
    nonWorkerDuration?: number;
    earliestStart?: string;
}>): any[] {
    return specs.map(s => ({
        taskId: s.id,
        name: `Task ${s.id}`,
        estimatedTotalLaborHours: s.hours,
        estimatedRemainingLaborHours: s.hours,
        minWorkers: s.minW ?? 1,
        maxWorkers: s.maxW ?? 3,
        prerequisiteTaskIds: s.prereqs,
        taskType: s.nonWorker ? 'nonWorker' : 'default',
        nonWorkerTaskDuration: s.nonWorkerDuration,
        earliestStartDate: s.earliestStart,
        requiredSkills: ['general']
    }));
}

// Simple assignments
function createAssignments(specs: Array<{
    w: string;
    t: string;
    start: number;
    end: number;
    isWait?: boolean;
}>): any[] {
    return specs.map(s => ({
        workerId: s.w,
        taskId: s.t,
        startDate: isoDate(s.start),
        endDate: isoDate(s.end),
        isWaitTask: s.isWait
    }));
}

// ============================================
// Test Case Interface
// ============================================

interface TestCase {
    id: string;
    name: string;
    description: string;
    category: string;
    input: any;
    expectedStatus: number;
    expectedErrorContains?: string;
    invariants: string[];
}

const testCases: TestCase[] = [];

// ============================================
// Category 1: Labor Task Updates (Increase)
// ============================================

// TC001: Simple increase labor hours
testCases.push({
    id: 'TC001',
    name: 'Increase labor hours - simple task',
    description: 'Increase a single task from 4 to 6 hours',
    category: 'labor_increase',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 6 }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'diff_minimal', 'prereqs_respected']
});

// TC002-TC010: More labor increase scenarios
for (let i = 2; i <= 10; i++) {
    const hoursIncrease = i;
    testCases.push({
        id: `TC00${i}`,
        name: `Increase labor hours by ${hoursIncrease}`,
        description: `Increase task hours by ${hoursIncrease} with cascading effects`,
        category: 'labor_increase',
        input: {
            currentTime: BASE_DATE,
            updates: [{ taskId: 't_1', laborHoursRemaining: 4 + hoursIncrease }],
            tasks: createTasks([
                { id: 't_1', hours: 4 },
                { id: 't_2', hours: 3, prereqs: ['t_1'] }
            ]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 2 },
                { w: 'w_2', t: 't_1', start: 0, end: 2 },
                { w: 'w_1', t: 't_2', start: 2, end: 3.5 },
                { w: 'w_2', t: 't_2', start: 2, end: 3.5 }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'diff_minimal', 'prereqs_respected', 'cascade_correct']
    });
}

// ============================================
// Category 2: Labor Task Updates (Decrease)
// ============================================

// TC011-TC020: Labor decrease scenarios
for (let i = 11; i <= 20; i++) {
    const hoursDecrease = i - 10;
    testCases.push({
        id: `TC0${i}`,
        name: `Decrease labor hours by ${hoursDecrease}`,
        description: `Decrease task hours by ${hoursDecrease}, dependent tasks should pull forward`,
        category: 'labor_decrease',
        input: {
            currentTime: BASE_DATE,
            updates: [{ taskId: 't_1', laborHoursRemaining: Math.max(1, 6 - hoursDecrease) }],
            tasks: createTasks([
                { id: 't_1', hours: 6 },
                { id: 't_2', hours: 3, prereqs: ['t_1'] }
            ]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 3 },
                { w: 'w_2', t: 't_1', start: 0, end: 3 },
                { w: 'w_1', t: 't_2', start: 3, end: 4.5 },
                { w: 'w_2', t: 't_2', start: 3, end: 4.5 }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'diff_minimal', 'prereqs_respected']
    });
}

// ============================================
// Category 3: interpretAs total vs remaining
// ============================================

// TC021-TC030: interpretAs scenarios
for (let i = 21; i <= 25; i++) {
    testCases.push({
        id: `TC0${i}`,
        name: `interpretAs total - case ${i - 20}`,
        description: 'Labor hours interpreted as total (default)',
        category: 'interpret_as',
        input: {
            currentTime: isoDate(1), // 1 hour into shift
            updates: [{ taskId: 't_1', laborHoursRemaining: 6, interpretAs: 'total' }],
            tasks: createTasks([{ id: 't_1', hours: 4 }]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 2 },
                { w: 'w_2', t: 't_1', start: 0, end: 2 }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'diff_minimal']
    });
}

for (let i = 26; i <= 30; i++) {
    testCases.push({
        id: `TC0${i}`,
        name: `interpretAs remaining - case ${i - 25}`,
        description: 'Labor hours interpreted as remaining work',
        category: 'interpret_as',
        input: {
            currentTime: isoDate(1),
            updates: [{ taskId: 't_1', laborHoursRemaining: 3, interpretAs: 'remaining' }],
            tasks: createTasks([{ id: 't_1', hours: 4 }]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 2 },
                { w: 'w_2', t: 't_1', start: 0, end: 2 }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'diff_minimal']
    });
}

// ============================================
// Category 4: Non-Labor (Wait) Tasks
// ============================================

// TC031-TC040: Non-labor task scenarios
for (let i = 31; i <= 35; i++) {
    const waitDuration = i - 30;
    testCases.push({
        id: `TC0${i}`,
        name: `Non-labor task between labor tasks - ${waitDuration}hr wait`,
        description: `Wait task of ${waitDuration} hours between two labor tasks`,
        category: 'non_labor',
        input: {
            currentTime: BASE_DATE,
            updates: [{ taskId: 't_1', laborHoursRemaining: 5 }], // Increase t_1
            tasks: createTasks([
                { id: 't_1', hours: 4 },
                { id: 't_wait', hours: 0, nonWorker: true, nonWorkerDuration: waitDuration, prereqs: ['t_1'] },
                { id: 't_2', hours: 3, prereqs: ['t_wait'] }
            ]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 2 },
                { w: 'w_2', t: 't_1', start: 0, end: 2 },
                { w: 'GAP_VIRTUAL_WORKER', t: 't_wait', start: 2, end: 2 + waitDuration, isWait: true },
                { w: 'w_1', t: 't_2', start: 2 + waitDuration, end: 3.5 + waitDuration },
                { w: 'w_2', t: 't_2', start: 2 + waitDuration, end: 3.5 + waitDuration }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'diff_minimal', 'prereqs_respected', 'wait_task_cascade']
    });
}

// TC036-TC040: Adjust wait task duration directly
for (let i = 36; i <= 40; i++) {
    const newWaitDuration = i - 34;
    testCases.push({
        id: `TC0${i}`,
        name: `Adjust wait task duration to ${newWaitDuration}hr`,
        description: `Directly adjust non-labor task duration`,
        category: 'non_labor',
        input: {
            currentTime: BASE_DATE,
            updates: [{ taskId: 't_wait', laborHoursRemaining: newWaitDuration }],
            tasks: createTasks([
                { id: 't_1', hours: 4 },
                { id: 't_wait', hours: 0, nonWorker: true, nonWorkerDuration: 1, prereqs: ['t_1'] },
                { id: 't_2', hours: 3, prereqs: ['t_wait'] }
            ]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 2 },
                { w: 'w_2', t: 't_1', start: 0, end: 2 },
                { w: 'GAP_VIRTUAL_WORKER', t: 't_wait', start: 2, end: 3, isWait: true },
                { w: 'w_1', t: 't_2', start: 3, end: 4.5 },
                { w: 'w_2', t: 't_2', start: 3, end: 4.5 }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'diff_minimal', 'prereqs_respected', 'non_labor_adjusted']
    });
}

// ============================================
// Category 5: Update After Task Ended
// ============================================

// TC041-TC050: currentTime after task end
for (let i = 41; i <= 50; i++) {
    const hoursAfterEnd = (i - 40) * 0.5;
    testCases.push({
        id: `TC0${i}`,
        name: `Update ${hoursAfterEnd}hr after task ended`,
        description: `Attempt to update a task after it has already completed`,
        category: 'after_task_end',
        input: {
            currentTime: isoDate(3 + hoursAfterEnd), // Task ends at hour 3
            updates: [{ taskId: 't_1', laborHoursRemaining: 6 }],
            tasks: createTasks([
                { id: 't_1', hours: 4 },
                { id: 't_2', hours: 3, prereqs: ['t_1'] }
            ]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 2 },
                { w: 'w_2', t: 't_1', start: 0, end: 2 },
                { w: 'w_1', t: 't_2', start: 2, end: 3.5 },
                { w: 'w_2', t: 't_2', start: 2, end: 3.5 }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'completed_task_handled']
    });
}

// ============================================
// Category 6: Multiple Updates in One Request
// ============================================

// TC051-TC060: Multiple simultaneous updates
for (let i = 51; i <= 60; i++) {
    const numUpdates = Math.min(i - 49, 5);
    const updates = Array.from({ length: numUpdates }, (_, j) => ({
        taskId: `t_${j + 1}`,
        laborHoursRemaining: 4 + j
    }));
    const tasks = createTasks(
        Array.from({ length: numUpdates + 1 }, (_, j) => ({
            id: `t_${j + 1}`,
            hours: 3,
            prereqs: j > 0 ? [`t_${j}`] : undefined
        }))
    );
    const assignments: any[] = [];
    let currentTime = 0;
    for (let j = 0; j < numUpdates + 1; j++) {
        assignments.push(
            { w: 'w_1', t: `t_${j + 1}`, start: currentTime, end: currentTime + 1.5 },
            { w: 'w_2', t: `t_${j + 1}`, start: currentTime, end: currentTime + 1.5 }
        );
        currentTime += 1.5;
    }
    testCases.push({
        id: `TC0${i}`,
        name: `Multiple updates - ${numUpdates} tasks`,
        description: `Update ${numUpdates} tasks simultaneously`,
        category: 'multiple_updates',
        input: {
            currentTime: BASE_DATE,
            updates,
            tasks,
            workers: createWorkers(2),
            originalAssignments: createAssignments(assignments)
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'diff_minimal', 'prereqs_respected']
    });
}

// ============================================
// Category 7: Worker Updates (Late Start)
// ============================================

// TC061-TC070: Worker late arrival
for (let i = 61; i <= 70; i++) {
    const lateHours = (i - 60) * 0.5;
    testCases.push({
        id: `TC0${i}`,
        name: `Worker late by ${lateHours}hr`,
        description: `Worker arrives ${lateHours} hours late`,
        category: 'worker_late',
        input: {
            currentTime: BASE_DATE,
            updates: [],
            workerUpdates: [{
                workerId: 'w_1',
                availability: {
                    startTime: isoDate(lateHours),
                    endTime: SHIFT_END
                }
            }],
            tasks: createTasks([{ id: 't_1', hours: 4 }]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 2 },
                { w: 'w_2', t: 't_1', start: 0, end: 2 }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'worker_availability_respected']
    });
}

// ============================================
// Category 8: Worker Updates (Reduced Availability)
// ============================================

// TC071-TC080: Worker leaves early
for (let i = 71; i <= 80; i++) {
    const earlyHours = (i - 70);
    testCases.push({
        id: `TC0${i}`,
        name: `Worker leaves ${earlyHours}hr early`,
        description: `Worker availability ends ${earlyHours} hours before shift end`,
        category: 'worker_early_leave',
        input: {
            currentTime: BASE_DATE,
            updates: [],
            workerUpdates: [{
                workerId: 'w_1',
                availability: {
                    startTime: BASE_DATE,
                    endTime: isoDate(14 - earlyHours) // Shift is 14 hours
                }
            }],
            tasks: createTasks([
                { id: 't_1', hours: 6 },
                { id: 't_2', hours: 6, prereqs: ['t_1'] }
            ]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 3 },
                { w: 'w_2', t: 't_1', start: 0, end: 3 },
                { w: 'w_1', t: 't_2', start: 3, end: 6 },
                { w: 'w_2', t: 't_2', start: 3, end: 6 }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'worker_availability_respected']
    });
}

// ============================================
// Category 9: earliestStartDate Constraints
// ============================================

// TC081-TC085: Tasks with earliestStartDate
for (let i = 81; i <= 85; i++) {
    const startDelay = (i - 80) * 2;
    testCases.push({
        id: `TC0${i}`,
        name: `earliestStartDate +${startDelay}hr`,
        description: `Task cannot start until ${startDelay} hours after shift start`,
        category: 'earliest_start',
        input: {
            currentTime: BASE_DATE,
            updates: [{ taskId: 't_1', laborHoursRemaining: 6 }],
            tasks: createTasks([
                { id: 't_1', hours: 4 },
                { id: 't_2', hours: 3, earliestStart: isoDate(startDelay) }
            ]),
            workers: createWorkers(2),
            originalAssignments: createAssignments([
                { w: 'w_1', t: 't_1', start: 0, end: 2 },
                { w: 'w_2', t: 't_1', start: 0, end: 2 },
                { w: 'w_1', t: 't_2', start: startDelay, end: startDelay + 1.5 },
                { w: 'w_2', t: 't_2', start: startDelay, end: startDelay + 1.5 }
            ])
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'earliest_start_respected']
    });
}

// TC086-TC090: Prerequisites blocking
for (let i = 86; i <= 90; i++) {
    const chainLength = i - 84;
    const tasks = createTasks(
        Array.from({ length: chainLength }, (_, j) => ({
            id: `t_${j + 1}`,
            hours: 2,
            prereqs: j > 0 ? [`t_${j}`] : undefined
        }))
    );
    const assignments: any[] = [];
    let time = 0;
    for (let j = 0; j < chainLength; j++) {
        assignments.push({ w: 'w_1', t: `t_${j + 1}`, start: time, end: time + 2 });
        time += 2;
    }
    testCases.push({
        id: `TC0${i}`,
        name: `Prerequisite chain length ${chainLength}`,
        description: `Chain of ${chainLength} dependent tasks`,
        category: 'prerequisites',
        input: {
            currentTime: BASE_DATE,
            updates: [{ taskId: 't_1', laborHoursRemaining: 4 }], // Double first task
            tasks,
            workers: createWorkers(1),
            originalAssignments: createAssignments(assignments)
        },
        expectedStatus: 200,
        invariants: ['no_overlaps', 'valid_times', 'prereqs_respected', 'cascade_correct']
    });
}

// ============================================
// Category 10: minWorkers/maxWorkers Edge Cases
// ============================================

// TC091-TC095: Tasks with specific worker requirements
testCases.push({
    id: 'TC091',
    name: 'Task requires exactly 1 worker',
    description: 'minWorkers=1, maxWorkers=1',
    category: 'worker_constraints',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 6 }],
        tasks: createTasks([{ id: 't_1', hours: 4, minW: 1, maxW: 1 }]),
        workers: createWorkers(3),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 4 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'worker_constraints_respected']
});

testCases.push({
    id: 'TC092',
    name: 'Task requires minimum 3 workers',
    description: 'minWorkers=3',
    category: 'worker_constraints',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 9 }],
        tasks: createTasks([{ id: 't_1', hours: 6, minW: 3, maxW: 5 }]),
        workers: createWorkers(4),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 },
            { w: 'w_3', t: 't_1', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'worker_constraints_respected']
});

testCases.push({
    id: 'TC093',
    name: 'Task with 0 minWorkers (optional)',
    description: 'minWorkers=0',
    category: 'worker_constraints',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 4 }],
        tasks: createTasks([{ id: 't_1', hours: 2, minW: 0, maxW: 2 }]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times']
});

testCases.push({
    id: 'TC094',
    name: 'Task with high maxWorkers',
    description: 'maxWorkers=10',
    category: 'worker_constraints',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 20 }],
        tasks: createTasks([{ id: 't_1', hours: 10, minW: 1, maxW: 10 }]),
        workers: createWorkers(5),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 },
            { w: 'w_3', t: 't_1', start: 0, end: 2 },
            { w: 'w_4', t: 't_1', start: 0, end: 2 },
            { w: 'w_5', t: 't_1', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'worker_constraints_respected']
});

testCases.push({
    id: 'TC095',
    name: 'Task needs more workers than available',
    description: 'minWorkers > available workers',
    category: 'worker_constraints',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 10 }],
        tasks: createTasks([{ id: 't_1', hours: 4, minW: 5, maxW: 10 }]),
        workers: createWorkers(3),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 },
            { w: 'w_3', t: 't_1', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'deficit_reported']
});

// ============================================
// Category 11: Invalid Inputs (400 Errors)
// ============================================

testCases.push({
    id: 'TC096',
    name: 'Empty updates array',
    description: 'Request with empty updates array (valid but no changes)',
    category: 'empty_updates',
    input: {
        currentTime: BASE_DATE,
        updates: [],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_changes']
});

testCases.push({
    id: 'TC097',
    name: 'Missing currentTime',
    description: 'Request without currentTime field',
    category: 'invalid_input',
    input: {
        updates: [{ taskId: 't_1', laborHoursRemaining: 4 }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: []
    },
    expectedStatus: 400,
    expectedErrorContains: 'currentTime',
    invariants: []
});

testCases.push({
    id: 'TC098',
    name: 'Invalid currentTime format',
    description: 'currentTime is not a valid ISO date',
    category: 'invalid_input',
    input: {
        currentTime: 'not-a-date',
        updates: [{ taskId: 't_1', laborHoursRemaining: 4 }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: []
    },
    expectedStatus: 400,
    expectedErrorContains: 'valid ISO',
    invariants: []
});

testCases.push({
    id: 'TC099',
    name: 'Negative laborHoursRemaining',
    description: 'Update with negative hours',
    category: 'invalid_input',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: -5 }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: []
    },
    expectedStatus: 400,
    expectedErrorContains: 'non-negative',
    invariants: []
});

testCases.push({
    id: 'TC100',
    name: 'Missing taskId in update',
    description: 'Update without taskId field',
    category: 'invalid_input',
    input: {
        currentTime: BASE_DATE,
        updates: [{ laborHoursRemaining: 4 }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: []
    },
    expectedStatus: 400,
    expectedErrorContains: 'taskId',
    invariants: []
});

testCases.push({
    id: 'TC101',
    name: 'Invalid taskId (non-existent)',
    description: 'Update references a task that does not exist',
    category: 'invalid_input',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_nonexistent', laborHoursRemaining: 4 }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200, // May succeed but produce no effect, or 400
    invariants: ['nonexistent_task_handled']
});

testCases.push({
    id: 'TC102',
    name: 'Missing tasks for ephemeral plan',
    description: 'Ephemeral plan without tasks definition',
    category: 'invalid_input',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 4 }],
        workers: createWorkers(2),
        originalAssignments: []
    },
    expectedStatus: 400,
    expectedErrorContains: 'tasks',
    invariants: []
});

testCases.push({
    id: 'TC103',
    name: 'Missing workers for ephemeral plan',
    description: 'Ephemeral plan without workers definition',
    category: 'invalid_input',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 4 }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        originalAssignments: []
    },
    expectedStatus: 400,
    expectedErrorContains: 'workers',
    invariants: []
});

testCases.push({
    id: 'TC104',
    name: 'Invalid worker update - missing workerId',
    description: 'Worker update without workerId',
    category: 'invalid_input',
    input: {
        currentTime: BASE_DATE,
        updates: [],
        workerUpdates: [{ availability: { startTime: BASE_DATE, endTime: SHIFT_END } }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: []
    },
    expectedStatus: 400,
    expectedErrorContains: 'workerId',
    invariants: []
});

testCases.push({
    id: 'TC105',
    name: 'Invalid worker update - invalid availability dates',
    description: 'Worker update with invalid date format',
    category: 'invalid_input',
    input: {
        currentTime: BASE_DATE,
        updates: [],
        workerUpdates: [{ workerId: 'w_1', availability: { startTime: 'bad', endTime: 'date' } }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: []
    },
    expectedStatus: 400,
    expectedErrorContains: 'valid',
    invariants: []
});

// ============================================
// Category 12: Complex Scenarios
// ============================================

testCases.push({
    id: 'TC106',
    name: 'Full cascade through 3 labor + 2 wait tasks',
    description: 'Complex chain with interleaved wait tasks',
    category: 'complex',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 6 }],
        tasks: createTasks([
            { id: 't_1', hours: 4 },
            { id: 't_wait1', hours: 0, nonWorker: true, nonWorkerDuration: 1, prereqs: ['t_1'] },
            { id: 't_2', hours: 3, prereqs: ['t_wait1'] },
            { id: 't_wait2', hours: 0, nonWorker: true, nonWorkerDuration: 2, prereqs: ['t_2'] },
            { id: 't_3', hours: 2, prereqs: ['t_wait2'] }
        ]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 },
            { w: 'GAP_VIRTUAL_WORKER', t: 't_wait1', start: 2, end: 3, isWait: true },
            { w: 'w_1', t: 't_2', start: 3, end: 4.5 },
            { w: 'w_2', t: 't_2', start: 3, end: 4.5 },
            { w: 'GAP_VIRTUAL_WORKER', t: 't_wait2', start: 4.5, end: 6.5, isWait: true },
            { w: 'w_1', t: 't_3', start: 6.5, end: 7.5 },
            { w: 'w_2', t: 't_3', start: 6.5, end: 7.5 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'prereqs_respected', 'wait_task_cascade', 'diff_minimal']
});

testCases.push({
    id: 'TC107',
    name: 'Worker + task update combined',
    description: 'Simultaneous worker availability change and task hour change',
    category: 'complex',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 8 }],
        workerUpdates: [{
            workerId: 'w_1',
            availability: { startTime: isoDate(2), endTime: SHIFT_END }
        }],
        tasks: createTasks([
            { id: 't_1', hours: 4 },
            { id: 't_2', hours: 4, prereqs: ['t_1'] }
        ]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 },
            { w: 'w_1', t: 't_2', start: 2, end: 4 },
            { w: 'w_2', t: 't_2', start: 2, end: 4 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'worker_availability_respected', 'diff_minimal']
});

testCases.push({
    id: 'TC108',
    name: 'Parallel tasks both updated',
    description: 'Two independent tasks updated simultaneously',
    category: 'complex',
    input: {
        currentTime: BASE_DATE,
        updates: [
            { taskId: 't_1', laborHoursRemaining: 6 },
            { taskId: 't_2', laborHoursRemaining: 5 }
        ],
        tasks: createTasks([
            { id: 't_1', hours: 4 },
            { id: 't_2', hours: 4 },
            { id: 't_3', hours: 3, prereqs: ['t_1', 't_2'] }
        ]),
        workers: createWorkers(4),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 },
            { w: 'w_3', t: 't_2', start: 0, end: 2 },
            { w: 'w_4', t: 't_2', start: 0, end: 2 },
            { w: 'w_1', t: 't_3', start: 2, end: 2.75 },
            { w: 'w_2', t: 't_3', start: 2, end: 2.75 },
            { w: 'w_3', t: 't_3', start: 2, end: 2.75 },
            { w: 'w_4', t: 't_3', start: 2, end: 2.75 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'prereqs_respected', 'diff_minimal']
});

// TC109-TC115: Additional edge cases
testCases.push({
    id: 'TC109',
    name: 'Zero-hour task update',
    description: 'Set task hours to 0 (task completion)',
    category: 'edge_case',
    input: {
        currentTime: isoDate(1),
        updates: [{ taskId: 't_1', laborHoursRemaining: 0 }],
        tasks: createTasks([
            { id: 't_1', hours: 4 },
            { id: 't_2', hours: 3, prereqs: ['t_1'] }
        ]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 },
            { w: 'w_1', t: 't_2', start: 2, end: 3.5 },
            { w: 'w_2', t: 't_2', start: 2, end: 3.5 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'task_completed_early']
});

testCases.push({
    id: 'TC110',
    name: 'Very large hour increase',
    description: 'Increase task from 4 to 100 hours',
    category: 'edge_case',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 100 }],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'shift_boundary_respected']
});

testCases.push({
    id: 'TC111',
    name: 'All workers unavailable',
    description: 'All workers have reduced availability to 0',
    category: 'edge_case',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 6 }],
        workerUpdates: [
            { workerId: 'w_1', availability: { startTime: BASE_DATE, endTime: BASE_DATE } },
            { workerId: 'w_2', availability: { startTime: BASE_DATE, endTime: BASE_DATE } }
        ],
        tasks: createTasks([{ id: 't_1', hours: 4 }]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200,
    invariants: ['deficit_reported']
});

testCases.push({
    id: 'TC112',
    name: 'Circular dependency detection',
    description: 'Tasks with potential circular dependency (should be rejected or handled)',
    category: 'edge_case',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 5 }],
        tasks: [
            { taskId: 't_1', name: 'Task 1', estimatedTotalLaborHours: 4, estimatedRemainingLaborHours: 4, minWorkers: 1, maxWorkers: 2, prerequisiteTaskIds: ['t_3'] },
            { taskId: 't_2', name: 'Task 2', estimatedTotalLaborHours: 3, estimatedRemainingLaborHours: 3, minWorkers: 1, maxWorkers: 2, prerequisiteTaskIds: ['t_1'] },
            { taskId: 't_3', name: 'Task 3', estimatedTotalLaborHours: 3, estimatedRemainingLaborHours: 3, minWorkers: 1, maxWorkers: 2, prerequisiteTaskIds: ['t_2'] }
        ],
        workers: createWorkers(2),
        originalAssignments: []
    },
    expectedStatus: 200, // May succeed with partial schedule or 400
    invariants: ['circular_handled']
});

testCases.push({
    id: 'TC113',
    name: 'Single worker, single task',
    description: 'Minimal scenario for ground truth verification',
    category: 'ground_truth',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 6 }],
        tasks: createTasks([{ id: 't_1', hours: 4, minW: 1, maxW: 1 }]),
        workers: createWorkers(1),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 4 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'optimal_solution']
});

testCases.push({
    id: 'TC114',
    name: '2 workers, 2 tasks sequential',
    description: 'Small case for exhaustive verification',
    category: 'ground_truth',
    input: {
        currentTime: BASE_DATE,
        updates: [{ taskId: 't_1', laborHoursRemaining: 6 }],
        tasks: createTasks([
            { id: 't_1', hours: 4 },
            { id: 't_2', hours: 4, prereqs: ['t_1'] }
        ]),
        workers: createWorkers(2),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_1', start: 0, end: 2 },
            { w: 'w_1', t: 't_2', start: 2, end: 4 },
            { w: 'w_2', t: 't_2', start: 2, end: 4 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'optimal_solution', 'prereqs_respected']
});

testCases.push({
    id: 'TC115',
    name: '3 workers, 3 tasks parallel',
    description: 'Small parallel case for exhaustive verification',
    category: 'ground_truth',
    input: {
        currentTime: BASE_DATE,
        updates: [
            { taskId: 't_1', laborHoursRemaining: 3 },
            { taskId: 't_2', laborHoursRemaining: 4 }
        ],
        tasks: createTasks([
            { id: 't_1', hours: 2, minW: 1, maxW: 1 },
            { id: 't_2', hours: 2, minW: 1, maxW: 1 },
            { id: 't_3', hours: 2, minW: 1, maxW: 1 }
        ]),
        workers: createWorkers(3),
        originalAssignments: createAssignments([
            { w: 'w_1', t: 't_1', start: 0, end: 2 },
            { w: 'w_2', t: 't_2', start: 0, end: 2 },
            { w: 'w_3', t: 't_3', start: 0, end: 2 }
        ])
    },
    expectedStatus: 200,
    invariants: ['no_overlaps', 'valid_times', 'optimal_solution']
});

// ============================================
// Output Generation
// ============================================

const OUTPUT_DIR = path.join(__dirname, '..', 'tests', 'replan');

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function generatePostmanCollection() {
    const collection = {
        info: {
            name: 'Replan API Test Suite',
            description: 'Comprehensive test suite for the /api/v1/plans/:planId/adjust endpoint',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: testCases.map(tc => ({
            name: `${tc.id}: ${tc.name}`,
            request: {
                method: 'POST',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: {
                    mode: 'raw',
                    raw: JSON.stringify(tc.input, null, 2)
                },
                url: {
                    raw: '{{baseUrl}}/api/{{apiVersion}}/plans/{{planId}}/adjust',
                    host: ['{{baseUrl}}'],
                    path: ['api', '{{apiVersion}}', 'plans', '{{planId}}', 'adjust']
                }
            },
            event: [
                {
                    listen: 'test',
                    script: {
                        exec: [
                            `pm.test("Status code is ${tc.expectedStatus}", function () {`,
                            `    pm.response.to.have.status(${tc.expectedStatus});`,
                            '});',
                            '',
                            tc.expectedStatus === 200 ? [
                                'pm.test("Response has required diff fields", function () {',
                                '    const json = pm.response.json();',
                                '    pm.expect(json).to.have.property("addedWorkerTasks");',
                                '    pm.expect(json).to.have.property("removedWorkerTasks");',
                                '    pm.expect(json).to.have.property("updatedWorkerTasks");',
                                '});'
                            ].join('\n') : [
                                'pm.test("Error response contains expected message", function () {',
                                '    const json = pm.response.json();',
                                '    pm.expect(json).to.have.property("error");',
                                tc.expectedErrorContains ? `    pm.expect(json.error.toLowerCase()).to.include("${tc.expectedErrorContains.toLowerCase()}");` : '',
                                '});'
                            ].join('\n')
                        ]
                    }
                }
            ]
        }))
    };
    return collection;
}

function main() {
    console.log(`Generating ${testCases.length} test cases...`);

    // Ensure directories exist
    ensureDir(path.join(OUTPUT_DIR, 'cases'));
    ensureDir(path.join(OUTPUT_DIR, 'expected'));
    ensureDir(path.join(OUTPUT_DIR, 'postman'));

    // Write individual case files
    for (const tc of testCases) {
        const caseFile = path.join(OUTPUT_DIR, 'cases', `${tc.id}.json`);
        fs.writeFileSync(caseFile, JSON.stringify({
            id: tc.id,
            name: tc.name,
            description: tc.description,
            category: tc.category,
            input: tc.input,
            expectedStatus: tc.expectedStatus,
            expectedErrorContains: tc.expectedErrorContains,
            invariants: tc.invariants
        }, null, 4));

        // Write expected output placeholder (to be filled by oracle or manual verification)
        const expectedFile = path.join(OUTPUT_DIR, 'expected', `${tc.id}.json`);
        fs.writeFileSync(expectedFile, JSON.stringify({
            id: tc.id,
            expectedStatus: tc.expectedStatus,
            invariants: tc.invariants,
            notes: 'Auto-generated placeholder. Run oracle to compute expected values for ground_truth cases.'
        }, null, 4));
    }

    // Write Postman collection
    const collection = generatePostmanCollection();
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'postman', 'replan-api-tests.postman_collection.json'),
        JSON.stringify(collection, null, 4)
    );

    // Write test index
    const index = testCases.map(tc => ({
        id: tc.id,
        name: tc.name,
        category: tc.category,
        expectedStatus: tc.expectedStatus
    }));
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'test-index.json'),
        JSON.stringify(index, null, 4)
    );

    console.log(`Generated:`);
    console.log(`  - ${testCases.length} test case files in tests/replan/cases/`);
    console.log(`  - ${testCases.length} expected output files in tests/replan/expected/`);
    console.log(`  - Postman collection in tests/replan/postman/`);
    console.log(`  - Test index in tests/replan/test-index.json`);
}

main();
