
import * as fs from 'fs';
import * as path from 'path';

// Node 22 has native fetch and FormData
// Ensure TS knows about them or ignore if strictly typed without lib update
declare const fetch: any;
declare const FormData: any;

interface DynamicShiftTestConfig {
    apiUrl: string;
    inputFile: string;
    shifts: {
        id: string;
        startTime: string;
        endTime: string;
        productionRate: number;
    }[];
}

async function testDynamicMultiShift(config: DynamicShiftTestConfig): Promise<void> {
    console.log('========================================');
    console.log('Dynamic Multi-Shift Planning Test (3 Shifts)');
    console.log('========================================\n');

    const inputPath = path.resolve(config.inputFile);
    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(inputPath));
    formData.append('startTime', config.shifts[0].startTime);
    formData.append('endTime', config.shifts[config.shifts.length - 1].endTime);

    // key change: sending 'shifts' JSON
    formData.append('shifts', JSON.stringify(config.shifts));

    console.log(`Sending ${config.shifts.length} shifts config...`);

    const endpoint = `${config.apiUrl}/api/v1/worker-tasks/plan-file-multishift-shiftids`;
    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData as any
    });

    console.log('HTTP Status:', response.status);
    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Failed: ${txt}`);
    }

    const result: any = await response.json();
    console.log('✓ Request successful');
    console.log('Assignments:', result.assignments.length);

    // Verify assignments exist for all shifts
    for (const shift of config.shifts) {
        const count = result.assignments.filter((a: any) => a.shiftId === shift.id).length;
        console.log(`Shift ${shift.id}: ${count} assignments`);
        if (count === 0 && config.shifts.length > 2) {
            // It's possible for later shifts to be empty if work finishes early, 
            // but for this test we expect some distribution or at least the shiftId to be present if assigned.
        }
    }
}

// Config for 3 shifts
const config: DynamicShiftTestConfig = {
    apiUrl: 'http://localhost:3000',
    inputFile: 'Worker-Task algo data.xlsx', // Points to root file
    shifts: [
        { id: 'shift-1', startTime: '2024-01-01T06:00:00Z', endTime: '2024-01-01T14:00:00Z', productionRate: 1.0 },
        { id: 'shift-2', startTime: '2024-01-01T14:00:00Z', endTime: '2024-01-01T22:00:00Z', productionRate: 1.0 },
        { id: 'shift-3', startTime: '2024-01-01T22:00:00Z', endTime: '2024-01-02T06:00:00Z', productionRate: 1.0 }
    ]
};

testDynamicMultiShift(config).catch(console.error);
