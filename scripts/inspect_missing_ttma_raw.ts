/**
 * DEEP INSPECT MISSING TTMAs
 *
 * Dumps the FULL raw data of the 5 templates that still have no TTMAs.
 * Checking for hidden fields, typos, or alternative data structures.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const serviceAccountPath = path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
}
const db = admin.firestore();

const MISSING_NAMES = [
    "Dry Time 2nd Coat",
    "Dry Time First Coat",
    "Dry Time Texture",
    "Paint - Spray Semi-Gloss Paint",
    "Fascia / Soffit Install"
];

async function main() {
    console.log('=== DEEP INSPECT MISSING TTMAs ===\n');

    const snap = await db.collection('taskTemplates').get();

    for (const name of MISSING_NAMES) {
        console.log(`\n--- Searching for "${name}" ---`);
        const docs = snap.docs.filter(d => d.data().name === name);

        if (docs.length === 0) {
            console.log('  ❌ No docs found with this name');
            continue;
        }

        for (const doc of docs) {
            console.log(`  Doc ID: ${doc.id}`);
            const data = doc.data();
            // detailed dump
            console.log(JSON.stringify(data, (key, value) => {
                if (value && typeof value === 'object' && value.constructor.name === 'DocumentReference') {
                    return `Ref(${value.path})`;
                }
                return value;
            }, 2));
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
