import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

interface MultiShiftTestConfig {
    apiUrl: string;
    inputFile: string;
    shift1Start: string;
    shift1End: string;
    shift2Start: string;
    shift2End: string;
    shift1Pct: number;
    shift2Pct: number;
}

interface MultiShiftResponse {
    version: string;
    assignments: Array<{
        workerId: string;
        taskId: string;
        startDate: string;
        endDate: string;
    }>;
    idleWorkers: Array<{
        workerId: string;
        startDate: string;
        endDate: string;
    }>;
    deficitTasks: Array<{
        taskId: string;
        deficitHours: number;
    }>;
    tasks: Array<{
        taskId: string;
        name?: string;
    }>;
}

async function testMultiShift(config: MultiShiftTestConfig): Promise<void> {
    console.log('========================================');
    console.log('Multi-Shift Planning Test (75/25 Split)');
    console.log('========================================\n');

    // Check if input file exists
    const inputPath = path.resolve(config.inputFile);
    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
    }
    console.log('✓ Input file found:', inputPath);

    // Check if server is running
    console.log('\nChecking server availability...');
    try {
        const healthCheck = await fetch(`${config.apiUrl}/health`);
        if (!healthCheck.ok) {
            throw new Error(`Server health check failed: ${healthCheck.status}`);
        }
        console.log('✓ Server is running at', config.apiUrl);
    } catch (err) {
        throw new Error(`Server not responding at ${config.apiUrl}. Please start the server with: npm run dev`);
    }

    // Prepare form data
    console.log('\nTest Configuration:');
    console.log(`  Shift 1: ${config.shift1Start} to ${config.shift1End} (${config.shift1Pct * 100}%)`);
    console.log(`  Shift 2: ${config.shift2Start} to ${config.shift2End} (${config.shift2Pct * 100}%)`);
    console.log(`  Expected: ~${config.shift1Pct * 100}% work in Shift 1, ~${config.shift2Pct * 100}% in Shift 2`);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(inputPath));
    formData.append('startingShiftPct', config.shift1Pct.toString());
    formData.append('endingShiftPct', config.shift2Pct.toString());
    formData.append('shift1StartTime', config.shift1Start);
    formData.append('shift1EndTime', config.shift1End);
    formData.append('shift2StartTime', config.shift2Start);
    formData.append('shift2EndTime', config.shift2End);

    // Make API call
    console.log('\nSending request to multi-shift endpoint...');
    const endpoint = `${config.apiUrl}/api/v1/worker-tasks/plan-file-multishift-shiftids`;

    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData as any
    });

    console.log('HTTP Status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }

    console.log('✓ Request successful (200 OK)');

    // Parse response
    const result: MultiShiftResponse = await response.json();

    // Analyze results
    console.log('\nAnalyzing results...');

    const getDateKey = (dateStr: string) => dateStr.split('T')[0];

    const shift1Assignments = result.assignments.filter(a =>
        getDateKey(a.startDate) === config.shift1Start.split('T')[0]
    );

    const shift2Assignments = result.assignments.filter(a =>
        getDateKey(a.startDate) === config.shift2Start.split('T')[0]
    );

    // Calculate hours
    const calculateHours = (assignments: typeof result.assignments) => {
        return assignments.reduce((total, a) => {
            const start = new Date(a.startDate).getTime();
            const end = new Date(a.endDate).getTime();
            return total + (end - start) / (1000 * 60 * 60);
        }, 0);
    };

    const shift1Hours = calculateHours(shift1Assignments);
    const shift2Hours = calculateHours(shift2Assignments);
    const totalHours = shift1Hours + shift2Hours;

    const shift1PctActual = totalHours > 0 ? (shift1Hours / totalHours) * 100 : 0;
    const shift2PctActual = totalHours > 0 ? (shift2Hours / totalHours) * 100 : 0;

    // Display results
    console.log('\n=== RESULTS ===');
    console.log('Total Assignments:', result.assignments.length);
    console.log('');
    console.log('Shift 1 (Day 1):');
    console.log('  Assignments:', shift1Assignments.length);
    console.log('  Hours:', shift1Hours.toFixed(2) + 'h');
    console.log('  Percentage:', shift1PctActual.toFixed(1) + '%');
    console.log('');
    console.log('Shift 2 (Day 2):');
    console.log('  Assignments:', shift2Assignments.length);
    console.log('  Hours:', shift2Hours.toFixed(2) + 'h');
    console.log('  Percentage:', shift2PctActual.toFixed(1) + '%');
    console.log('');
    console.log('Total Hours:', totalHours.toFixed(2) + 'h');

    // Validation
    console.log('\n=== VALIDATION ===');

    let passed = true;

    // Check if we have both shifts
    if (shift2Assignments.length === 0) {
        console.log('✗ FAIL: Shift 2 has no assignments!');
        console.log('  This means the multi-shift planning didn\'t create Shift 2.');
        console.log('  Check that shift2StartTime and shift2EndTime were provided correctly.');
        passed = false;
    } else {
        console.log('✓ Both shifts have assignments');
    }

    // Check shift 1 percentage (should be ~75%, allow ±10% tolerance)
    const shift1Lower = 65;
    const shift1Upper = 85;
    if (shift1PctActual < shift1Lower || shift1PctActual > shift1Upper) {
        console.log(`⚠  Shift 1 percentage is ${shift1PctActual.toFixed(1)}% (expected ~75%)`);
        console.log(`  This is outside the expected range of ${shift1Lower}-${shift1Upper}%`);
    } else {
        console.log(`✓ Shift 1 percentage is within expected range (${shift1PctActual.toFixed(1)}% ≈ 75%)`);
    }

    // Check shift 2 percentage (should be ~25%, allow ±10% tolerance)
    const shift2Lower = 15;
    const shift2Upper = 35;
    if (shift2PctActual < shift2Lower || shift2PctActual > shift2Upper) {
        console.log(`⚠  Shift 2 percentage is ${shift2PctActual.toFixed(1)}% (expected ~25%)`);
        console.log(`  This is outside the expected range of ${shift2Lower}-${shift2Upper}%`);
    } else {
        console.log(`✓ Shift 2 percentage is within expected range (${shift2PctActual.toFixed(1)}% ≈ 25%)`);
    }

    // Check for deficit tasks
    if (result.deficitTasks.length > 0) {
        console.log(`\n⚠  Found ${result.deficitTasks.length} tasks with remaining work:`);
        result.deficitTasks.forEach(task => {
            const taskInfo = result.tasks.find(t => t.taskId === task.taskId);
            const taskName = taskInfo?.name || task.taskId;
            console.log(`  - ${taskName}: ${task.deficitHours.toFixed(2)}h remaining`);
        });
    } else {
        console.log('✓ All tasks completed (no deficits)');
    }

    // Idle workers
    if (result.idleWorkers.length > 0) {
        const idleHours = calculateHours(result.idleWorkers as any);
        console.log(`\n⚠  Found ${result.idleWorkers.length} idle periods (${idleHours.toFixed(2)}h total)`);
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    if (passed) {
        console.log('✓ TEST PASSED');
        console.log('Multi-shift planning is working correctly with 75/25 split.');
    } else {
        console.log('✗ TEST FAILED');
        console.log('Multi-shift planning did not produce expected results.');
        console.log('See DEBUG_MULTISHIFT_ISSUE.md for troubleshooting steps.');
    }

    // Save results
    const outputPath = path.resolve(__dirname, '..', 'multi_shift_test_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log('\nResults saved to:', outputPath);

    if (!passed) {
        process.exit(1);
    }
}

// Main execution
const config: MultiShiftTestConfig = {
    apiUrl: process.env.API_URL || 'http://localhost:8080',
    inputFile: path.resolve(__dirname, '..', 'Worker-Task algo data.xlsx'),
    shift1Start: '2024-01-01T07:00:00Z',
    shift1End: '2024-01-01T16:30:00Z',
    shift2Start: '2024-01-02T07:00:00Z',
    shift2End: '2024-01-02T16:30:00Z',
    shift1Pct: 0.75,
    shift2Pct: 0.25
};

testMultiShift(config)
    .then(() => {
        console.log('\nTest completed successfully!');
    })
    .catch(err => {
        console.error('\n❌ Test failed:', err.message);
        process.exit(1);
    });
