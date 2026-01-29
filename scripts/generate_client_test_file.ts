/**
 * Generate Sample Test Excel File for Client Testing
 *
 * Creates a realistic test file with:
 * - 10 workers with varied skills
 * - 8 tasks representing a typical modular construction workflow
 * - Proper labor hour estimates
 *
 * Run: npx ts-node scripts/generate_client_test_file.ts
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

// Sample Workers - representing a typical crew
const workers = [
    { workerId: 'w_1', name: 'John Martinez', shiftPreference: 'shift-1' },
    { workerId: 'w_2', name: 'Sarah Johnson', shiftPreference: 'shift-1' },
    { workerId: 'w_3', name: 'Mike Chen', shiftPreference: 'shift-1' },
    { workerId: 'w_4', name: 'Emily Davis', shiftPreference: 'shift-1' },
    { workerId: 'w_5', name: 'Carlos Rodriguez', shiftPreference: 'shift-1' },
    { workerId: 'w_6', name: 'Amanda Wilson', shiftPreference: 'shift-2' },
    { workerId: 'w_7', name: 'David Kim', shiftPreference: 'shift-2' },
    { workerId: 'w_8', name: 'Lisa Thompson', shiftPreference: 'shift-2' },
    { workerId: 'w_9', name: 'Robert Brown', shiftPreference: 'shift-2' },
    { workerId: 'w_10', name: 'Jennifer Lee', shiftPreference: 'shift-2' },
];

// Sample Tasks - representing modular construction workflow
const tasks = [
    {
        taskId: 'task_1',
        name: 'Interior Framing',
        minWorkers: 2,
        maxWorkers: 4,
        estimatedTotalLaborHours: 24,
        prerequisiteTaskIds: '',
        shiftCompletionPreference: 'prefersCompleteWithinShift'
    },
    {
        taskId: 'task_2',
        name: 'Electrical Rough-In',
        minWorkers: 1,
        maxWorkers: 3,
        estimatedTotalLaborHours: 16,
        prerequisiteTaskIds: 'task_1',
        shiftCompletionPreference: 'doesNotMatter'
    },
    {
        taskId: 'task_3',
        name: 'Plumbing Rough-In',
        minWorkers: 1,
        maxWorkers: 2,
        estimatedTotalLaborHours: 12,
        prerequisiteTaskIds: 'task_1',
        shiftCompletionPreference: 'doesNotMatter'
    },
    {
        taskId: 'task_4',
        name: 'HVAC Ducting',
        minWorkers: 2,
        maxWorkers: 3,
        estimatedTotalLaborHours: 18,
        prerequisiteTaskIds: 'task_1',
        shiftCompletionPreference: 'doesNotMatter'
    },
    {
        taskId: 'task_5',
        name: 'Drywall Hanging',
        minWorkers: 2,
        maxWorkers: 4,
        estimatedTotalLaborHours: 20,
        prerequisiteTaskIds: 'task_2,task_3,task_4',
        shiftCompletionPreference: 'prefersCompleteWithinShift'
    },
    {
        taskId: 'task_6',
        name: 'Drywall Taping & Mud',
        minWorkers: 1,
        maxWorkers: 3,
        estimatedTotalLaborHours: 15,
        prerequisiteTaskIds: 'task_5',
        shiftCompletionPreference: 'mustCompleteWithinShift'
    },
    {
        taskId: 'task_7',
        name: 'Interior Painting',
        minWorkers: 2,
        maxWorkers: 4,
        estimatedTotalLaborHours: 22,
        prerequisiteTaskIds: 'task_6',
        shiftCompletionPreference: 'doesNotMatter'
    },
    {
        taskId: 'task_8',
        name: 'Finish Carpentry & Trim',
        minWorkers: 1,
        maxWorkers: 2,
        estimatedTotalLaborHours: 10,
        prerequisiteTaskIds: 'task_7',
        shiftCompletionPreference: 'prefersCompleteWithinShift'
    },
];

function generateTestFile() {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Workers sheet
    const workersSheet = XLSX.utils.json_to_sheet(workers);
    XLSX.utils.book_append_sheet(wb, workersSheet, 'Workers');

    // Tasks sheet
    const tasksSheet = XLSX.utils.json_to_sheet(tasks);
    XLSX.utils.book_append_sheet(wb, tasksSheet, 'Tasks');

    // Add a summary/info sheet
    const info = [
        { field: 'Description', value: 'Sample test file for Modular Factory Scheduler' },
        { field: 'Workers', value: '10 workers (5 prefer Shift 1, 5 prefer Shift 2)' },
        { field: 'Tasks', value: '8 tasks representing modular construction workflow' },
        { field: 'Total Labor Hours', value: '137 hours' },
        { field: 'Recommended Test', value: 'Multi-shift with 75/25 split' },
        { field: 'Generated', value: new Date().toISOString() },
    ];
    const infoSheet = XLSX.utils.json_to_sheet(info);
    XLSX.utils.book_append_sheet(wb, infoSheet, 'Info');

    // Write file
    const outputPath = path.join(__dirname, '..', 'client_test_file.xlsx');
    XLSX.writeFile(wb, outputPath);

    console.log(`✅ Test file generated: ${outputPath}`);
    console.log(`\n📋 Contents:`);
    console.log(`   - ${workers.length} workers`);
    console.log(`   - ${tasks.length} tasks`);
    console.log(`   - Total labor: ${tasks.reduce((sum, t) => sum + t.estimatedTotalLaborHours, 0)} hours`);
    console.log(`\n🧪 To test:`);
    console.log(`   1. Upload client_test_file.xlsx to the UI`);
    console.log(`   2. Run Multi-Shift with 75/25 split`);
    console.log(`   3. View Gantt chart and export results`);
}

generateTestFile();
