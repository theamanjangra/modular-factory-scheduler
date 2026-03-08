
import * as admin from 'firebase-admin';
import * as path from 'path';

// Load the service account (user provided path)
const serviceAccount = require(path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSchema() {
    console.log("Checking Firestore Schema (Read-Only)...");

    try {
        // 1. Check Tasks
        console.log("\n--- TASKS ---");
        const tasksSnap = await db.collection('tasks').limit(1).get();
        if (tasksSnap.empty) {
            console.log("Collection 'tasks' is empty or missing.");
        } else {
            console.log("Sample Task ID:", tasksSnap.docs[0].id);
            console.log("Data:", JSON.stringify(tasksSnap.docs[0].data(), null, 2));
        }

        // 2. Check Shifts (if they exist)
        console.log("\n--- SHIFTS ---");
        const shiftsSnap = await db.collection('shifts').limit(1).get();
        if (shiftsSnap.empty) {
            console.log("Collection 'shifts' is empty or missing. (This is common, might be hardcoded in app)");
        } else {
            console.log("Sample Shift ID:", shiftsSnap.docs[0].id);
            console.log("Data:", JSON.stringify(shiftsSnap.docs[0].data(), null, 2));
        }

        // 3. Check TaskTemplates (often used instead of raw tasks)
        console.log("\n--- TASK TEMPLATES ---");
        const ttSnap = await db.collection('task_templates').limit(1).get();
        if (ttSnap.empty) {
            // Try camelCase
            const ttSnap2 = await db.collection('taskTemplates').limit(1).get();
            if (ttSnap2.empty) {
                console.log("Collection 'task_templates' / 'taskTemplates' is empty or missing.");
            } else {
                console.log("Found 'taskTemplates'!", ttSnap2.docs[0].id);
            }
        } else {
            console.log("Sample TaskTemplate:", ttSnap.docs[0].id);
        }

    } catch (error) {
        console.error("Error accessing Firestore:", error);
    }
}

checkSchema();
