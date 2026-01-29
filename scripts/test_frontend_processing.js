// Simulating exactly what the Gantt frontend does
const { parseExcelData } = require('../dist/utils/excelLoader');
const { PlanningService } = require('../dist/services/planningService');
const { aggregateSchedule } = require('../dist/utils/scheduleAggregator');
const fs = require('fs');
const path = require('path');

const buffer = fs.readFileSync(path.join(__dirname, '../closeup-simulation.xlsx'));
const { workers, tasks } = parseExcelData(buffer);
const planningService = new PlanningService();
const request = {
    workers,
    tasks,
    interval: { startTime: '2024-01-01T07:00:00Z', endTime: '2024-01-01T17:00:00Z' },
    useHistorical: false
};
const rawSteps = planningService.plan(request);
const aggregated = aggregateSchedule(rawSteps);

// Simulate what the API returns
const apiResponse = {
    version: 'v2-god-mode',
    ...aggregated,
    assignments: aggregated.story,
    items: aggregated.assignments
};

console.log('=== SIMULATING FRONTEND GANTT PROCESSING ===');
const data = apiResponse;
const rawAssignments = data.assignments || [];
console.log('Step 1 - Raw assignments count:', rawAssignments.length);

// Step 2: Filter out comments
const afterCommentFilter = rawAssignments.filter(x => x.type !== 'comment');
console.log('Step 2 - After comment filter:', afterCommentFilter.length);

// Step 3: Parse dates
const withDates = afterCommentFilter.map(a => {
    const s = new Date(a.startDate || a.startTime || '2000-01-01');
    const e = new Date(a.endDate || a.endTime || '2000-01-01');
    return { ...a, s, e };
});
console.log('Step 3 - After date parsing:', withDates.length);

// Step 4: Filter valid dates
const assignments = withDates.filter(a => !isNaN(a.s.getTime()) && !isNaN(a.e.getTime()));
console.log('Step 4 - After valid date filter:', assignments.length);

// Worker view processing
const validWorkItems = assignments.filter(a => !!a.workerId);
console.log('\nWorker View - Valid work items:', validWorkItems.length);
const workerIds = Array.from(new Set(validWorkItems.map(a => a.workerId))).sort();
console.log('Worker View - Unique workerIds:', workerIds.length);
console.log('Worker IDs:', workerIds);

// Task view processing
const taskNames = Array.from(new Set(assignments.map(a => a.taskName || a.taskId || 'Unknown'))).sort();
console.log('\nTask View - Unique taskNames:', taskNames.length);

// Sample first item
console.log('\nSample story item (first assignment):', JSON.stringify(rawAssignments.find(x => x.type !== 'comment'), null, 2));
