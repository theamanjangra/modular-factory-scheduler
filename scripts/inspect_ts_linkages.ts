a/**
 * INSPECT TIME STUDY LINKAGES
 *
 * Check raw TimeStudy documents for any fields that might link them
 * to a specific module or traveler (e.g. traveler_id, module_id, job_id).
 *
 * If found, we can use that to fetch the actual module attributes
 * for that specific time study and fix the data mismatch.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { v5 as uuidv5 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const serviceAccountPath = path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
}
const db = admin.firestore();

async function main() {
    console.log('=== INSPECT TIME STUDY LINKAGES ===\n');

    const tsSnap = await db.collection('timeStudies').get();

    // Check first 10 docs for unknown fields
    console.log(`Analyzing ${tsSnap.size} Time Studies...`);

    const knownFields = new Set([
        'clock_time', 'clockTime',
        'worker_count', 'workerCount',
        'task_template', 'taskTemplate',
        'task_code', 'taskCode',
        'module_attributes', 'moduleAttributes',
        'description', 'notes', 'date', 'created_at', 'createdAt',
        'user_id', 'userId', 'employee_id', 'employeeId'
    ]);

    const potentialLinks = new Map<string, number>();

    for (const doc of tsSnap.docs) {
        const data = doc.data();
        for (const key of Object.keys(data)) {
            if (!knownFields.has(key)) {
                potentialLinks.set(key, (potentialLinks.get(key) || 0) + 1);
            }
        }
    }

    if (potentialLinks.size > 0) {
        console.log('\nFound potentially useful hidden fields:');
        for (const [key, count] of potentialLinks) {
            console.log(`  "${key}": present in ${count} docs`);
            // Show sample value
            const sample = tsSnap.docs.find(d => d.data()[key] !== undefined);
            if (sample) {
                console.log(`    Sample: ${JSON.stringify(sample.data()[key])}`);
            }
        }
    } else {
        console.log('\n❌ No hidden linking fields found (only standard fields exist).');
    }

    // Also check deeper: maybe the notes/description contains a job number?
    console.log('\nChecking descriptions for job/unit numbers (pattern: "Job #..." or "Unit #..."):');
    const jobRegex = /(job|unit|module)\s*#?\s*([a-z0-9-]+)/i;
    let matchCount = 0;

    for (const doc of tsSnap.docs) {
        const desc = doc.data().description || doc.data().notes || '';
        const match = String(desc).match(jobRegex);
        if (match) {
            console.log(`  Doc ${doc.id}: "${desc}" -> extracted "${match[2]}"`);
            matchCount++;
        }
    }

    if (matchCount === 0) {
        console.log('  ❌ No job identifiers found in descriptions.');
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
