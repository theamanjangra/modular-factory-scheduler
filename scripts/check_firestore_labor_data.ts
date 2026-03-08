/**
 * Check if Firestore has the collections needed for labor estimation:
 * - moduleAttribute / module_attribute
 * - moduleProfileModuleAttribute / module_profile_module_attribute
 * - taskTemplateModuleAttribute / task_template_module_attribute
 * - timeStudy / time_study
 * - timeStudyModuleAttribute / time_study_module_attribute
 * 
 * Usage: node -e "require('dotenv').config({path: '.env.local'}); require('ts-node').register({transpileOnly: true}); require('./scripts/check_firestore_labor_data.ts');"
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Initialize Firebase with service account (same as import_from_firebase.ts)
const serviceAccountPath = path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
    });
}

const db = admin.firestore();

async function checkCollection(name: string) {
    try {
        const snapshot = await db.collection(name).limit(3).get();
        if (snapshot.empty) {
            console.log(`  ❌ "${name}": EMPTY (0 docs)`);
            return 0;
        }
        // Get total count
        const allSnapshot = await db.collection(name).get();
        const count = allSnapshot.size;
        console.log(`  ✅ "${name}": ${count} documents`);

        // Show first doc structure
        const firstDoc = snapshot.docs[0];
        const data = firstDoc.data();
        const fields = Object.keys(data);
        console.log(`     Fields: ${fields.join(', ')}`);
        console.log(`     Sample: ${JSON.stringify(data).substring(0, 200)}`);
        return count;
    } catch (e: any) {
        console.log(`  ⚠ "${name}": Error - ${e.message}`);
        return -1;
    }
}

async function main() {
    console.log('=== Checking Firestore for Labor Estimation Data ===\n');

    // Try both camelCase and snake_case naming conventions
    const collectionsToCheck = [
        // Module Attributes
        'moduleAttribute', 'module_attribute', 'moduleAttributes', 'module_attributes',
        // Module Profile Module Attributes
        'moduleProfileModuleAttribute', 'module_profile_module_attribute',
        'moduleProfileModuleAttributes', 'module_profile_module_attributes',
        // Task Template Module Attributes
        'taskTemplateModuleAttribute', 'task_template_module_attribute',
        'taskTemplateModuleAttributes', 'task_template_module_attributes',
        // Time Studies
        'timeStudy', 'time_study', 'timeStudies', 'time_studies',
        // Time Study Module Attributes
        'timeStudyModuleAttribute', 'time_study_module_attribute',
        'timeStudyModuleAttributes', 'time_study_module_attributes',
        // Module Profile (already imported but check for sub-collections)
        'moduleProfile', 'module_profile', 'moduleProfiles', 'module_profiles',
    ];

    console.log('Checking top-level collections...\n');

    for (const name of collectionsToCheck) {
        await checkCollection(name);
    }

    // Also check if these might be sub-collections under known parents
    console.log('\n--- Checking sub-collections under known parents ---\n');

    // Check under moduleProfile docs
    const mpSnapshot = await db.collection('moduleProfile').limit(1).get()
        .catch(() => db.collection('module_profile').limit(1).get())
        .catch(() => null);

    if (mpSnapshot && !mpSnapshot.empty) {
        const mpDoc = mpSnapshot.docs[0];
        console.log(`  ModuleProfile doc: ${mpDoc.id}`);
        const subCollections = await mpDoc.ref.listCollections();
        console.log(`  Sub-collections: ${subCollections.map(c => c.id).join(', ') || '(none)'}`);

        for (const sub of subCollections) {
            const subSnapshot = await sub.limit(2).get();
            console.log(`    "${sub.id}": ${subSnapshot.size} docs (sampled)`);
            if (!subSnapshot.empty) {
                const data = subSnapshot.docs[0].data();
                console.log(`      Fields: ${Object.keys(data).join(', ')}`);
            }
        }
    }

    // Check under taskTemplate docs
    const ttSnapshot = await db.collection('taskTemplate').limit(1).get()
        .catch(() => db.collection('task_template').limit(1).get())
        .catch(() => null);

    if (ttSnapshot && !ttSnapshot.empty) {
        const ttDoc = ttSnapshot.docs[0];
        console.log(`\n  TaskTemplate doc: ${ttDoc.id}`);
        const subCollections = await ttDoc.ref.listCollections();
        console.log(`  Sub-collections: ${subCollections.map(c => c.id).join(', ') || '(none)'}`);

        for (const sub of subCollections) {
            const subSnapshot = await sub.limit(2).get();
            console.log(`    "${sub.id}": ${subSnapshot.size} docs (sampled)`);
            if (!subSnapshot.empty) {
                const data = subSnapshot.docs[0].data();
                console.log(`      Fields: ${Object.keys(data).join(', ')}`);
            }
        }
    }

    // Also list ALL top-level collections for reference
    console.log('\n--- All Top-Level Collections ---\n');
    const allCollections = await db.listCollections();
    for (const col of allCollections) {
        console.log(`  - ${col.id}`);
    }

    console.log('\nDone.');
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
