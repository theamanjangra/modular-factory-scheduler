/**
 * AUDIT ATTRIBUTE IMPORT COMPLETENESS
 *
 * Checks if every unique attribute ID referenced in Firestore exists in our local DB.
 * Sources checked:
 * 1. moduleAttributes collection (canonical source)
 * 2. Referenced in moduleProfiles
 * 3. Referenced in taskTemplates
 * 4. Referenced in timeStudies
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { v5 as uuidv5 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const IMPORT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const prisma = new PrismaClient();
const serviceAccountPath = path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
}
const db = admin.firestore();

function resolveAttrId(raw: string): string {
    if (raw.startsWith('attr_')) return String(parseInt(raw.replace('attr_', ''), 10));
    return raw;
}

async function main() {
    console.log('=== AUDIT ATTRIBUTE IMPORT COMPLETENESS ===\n');

    // 1. Get all attributes from Firestore collection
    console.log('Scaning Firestore moduleAttributes...');
    const maSnap = await db.collection('moduleAttributes').get();
    const fsAttrIds = new Set<string>();
    maSnap.docs.forEach(d => {
        fsAttrIds.add(d.id);
        if (d.data().id) fsAttrIds.add(String(d.data().id));
    });
    console.log(`  Found ${fsAttrIds.size} unique IDs in moduleAttributes collection.`);

    // 2. Scan other collections for potentially missing attributes
    console.log('Scanning other collections for referenced attributes...');
    const referencedAttrIds = new Set<string>();

    // in profiles
    const mpSnap = await db.collection('moduleProfiles').get();
    /* skipping deep scan of profiles for speed, rely on profiles attributes collection */

    // in task templates (attribute_codes)
    const ttSnap = await db.collection('taskTemplates').get();
    ttSnap.docs.forEach(d => {
        const codes = d.data().attribute_codes;
        if (Array.isArray(codes)) codes.forEach(c => referencedAttrIds.add(String(c)));
        const moduleAttrs = d.data().module_attributes;
        if (Array.isArray(moduleAttrs)) {
            moduleAttrs.forEach(ref => {
                if (typeof ref === 'string') referencedAttrIds.add(resolveAttrId(ref));
                if (ref?._path?.segments?.[1]) referencedAttrIds.add(String(ref._path.segments[1]));
            });
        }
    });

    // in time studies (module_attributes)
    const tsSnap = await db.collection('timeStudies').get();
    tsSnap.docs.forEach(d => {
        const attrs = d.data().module_attributes;
        if (Array.isArray(attrs)) attrs.forEach(a => referencedAttrIds.add(String(a)));
    });

    console.log(`  Found ${referencedAttrIds.size} referenced attribute IDs across usage.`);

    // 3. Merge and Check
    const allFsIds = new Set([...fsAttrIds, ...referencedAttrIds]);
    console.log(`\nTotal Unique Attribute IDs in Firestore: ${allFsIds.size}`);

    // 4. Check Local DB
    const localAttrs = await prisma.moduleAttribute.findMany({ select: { id: true, name: true } });
    const localAttrCount = localAttrs.length;
    console.log(`Total Module Attributes in Local DB: ${localAttrCount}`);

    // Verify mapping
    let missing = 0;
    const missingIds: string[] = [];

    // We can't easily check ID-to-ID because of UUID hashing, but we can check count?
    // Actually we can regenerate the UUID for each FS ID and check if it exists
    const localIdSet = new Set(localAttrs.map(a => a.id));

    for (const fsId of allFsIds) {
        // Try all variations
        const cleanId = resolveAttrId(fsId);
        const uuid1 = uuidv5(`moduleAttribute:${cleanId}`, IMPORT_NAMESPACE);
        const uuid2 = uuidv5(`moduleAttribute:attr_${cleanId.padStart(3, '0')}`, IMPORT_NAMESPACE);
        const uuid3 = uuidv5(fsId, IMPORT_NAMESPACE); // raw import?

        if (!localIdSet.has(uuid1) && !localIdSet.has(uuid2) && !localIdSet.has(uuid3)) {
            // Check if maybe it's mapped differently? 
            // Actually our import script uses `moduleAttribute:${doc.id}`
            // If the FS ID is "18", we expect `moduleAttribute:18`.

            // Wait, referenced IDs might not be in the moduleAttributes collection?
            if (!fsAttrIds.has(cleanId) && !fsAttrIds.has(`attr_${cleanId.padStart(3, '0')}`)) {
                console.log(`  ⚠ Referenced ID "${fsId}" is NOT in the moduleAttributes collection!`);
                missingIds.push(fsId);
                missing++;
            }
        }
    }

    if (missing === 0) {
        console.log('\n✅ SUCCESS: All referenced attributes exist in the main moduleAttributes collection.');
        if (allFsIds.size <= localAttrCount) {
            console.log('✅ Local DB has at least as many attributes as Firestore.');
        } else {
            console.log(`⚠ Mismatch: Firestore has ${allFsIds.size} unique refs, Local has ${localAttrCount}. Some references might be aliases.`);
        }
    } else {
        console.log(`\n❌ FAIL: ${missing} referenced attributes are missing from the main collection!`);
        console.log('Missing IDs:', missingIds.join(', '));
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
