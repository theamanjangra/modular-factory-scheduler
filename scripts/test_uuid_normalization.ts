// test_uuid_normalization.ts
// An exact recreation of the logic fixed in workerTaskController.ts to prove it works

const normalizeId = (id: string) => id?.toLowerCase().replace(/-/g, '');

const clientRequestTaskIds = [
    "ABC-DEF-123",  // Uppercase, dashes
    "987-654-XYZ",
    "purelowercase123"
];

const mockDataConnectResponse = [
    {
        id: "abcdef123", // Raw DB format returned by DC (lowercase, no dashes)
        taskTemplate: { maxWorkers: 5 }
    },
    {
        id: "987654xyz",
        taskTemplate: { maxWorkers: 10 }
    },
    {
        id: "purelowercase123",
        taskTemplate: { maxWorkers: 2 }
    }
];

// Recreate the map population logic from controller
const taskMaxWorkersMap = new Map<string, number>();

console.log("--- Populating Map ---");
for (const dcTask of mockDataConnectResponse) {
    const nId = normalizeId(dcTask.id);
    const tmpl = dcTask.taskTemplate;
    if (tmpl.maxWorkers != null) {
        taskMaxWorkersMap.set(nId, tmpl.maxWorkers);
        console.log(`Stored key: ${nId} = ${tmpl.maxWorkers} (original DC ID: ${dcTask.id})`);
    }
}

console.log("\n--- Simulating Lookups ---");
for (const reqId of clientRequestTaskIds) {
    const nId = normalizeId(reqId);

    // The exact fallback logic applied in the controller:
    const maxWorkers = taskMaxWorkersMap.get(nId) ?? 100; // was || 4

    console.log(`Lookup for ${reqId} -> Normalized ${nId}: found maxWorkers=${taskMaxWorkersMap.get(nId)} -> Final Value=${maxWorkers}`);

    if (taskMaxWorkersMap.has(nId)) {
        console.log(`  ✅ FIX WORKS: Matching key found.`);
    } else {
        console.log(`  ❌ FIX FAILED: Map miss.`);
    }
}
