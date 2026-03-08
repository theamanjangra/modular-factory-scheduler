/**
 * CLEAN RE-IMPORT: Complete Labor Estimation Data from Firestore → Local Postgres
 * 
 * This script is READ-ONLY against Firebase/Firestore.
 * It writes ONLY to the local Postgres database.
 * 
 * What we now know:
 * 
 * 1. taskTemplates: TWO ID formats
 *    - Numeric IDs (1-73): used by time studies via task_code/task_template ref
 *    - Hash IDs (sha256-like): used by taskTemplateModuleAttributes
 *    - BOTH contain the same template names
 *    - We import from BOTH, DB UUID = uuidv5(docId, NAMESPACE). Original import
 *      already created them.
 * 
 * 2. timeStudies: 
 *    - clock_time, worker_count, description
 *    - task_template: DocumentReference to numeric taskTemplates (e.g., taskTemplates/28) 
 *    - module_attributes: Array of ATTRIBUTE ID STRINGS (e.g., ["18", "1"])
 *      → these tell us WHICH attributes are RELEVANT to this time study
 *      → they are NOT key-value pairs; we import as timeStudyModuleAttribute
 *        linking to the attribute, without a "study value"
 * 
 * 3. moduleProfileAttributes (112 docs):
 *    - SEPARATE from moduleProfileModuleAttributes (1580 docs)
 *    - Uses SHORT profile IDs like "2603-A02" (not Firestore doc IDs)
 *    - {moduleProfileId: "2603-A02", attributeId: "3", value: 455}
 *    → We need to match these to DB module profiles by name-contains
 * 
 * 4. moduleAttributes: numeric doc IDs (1-58)
 *    - Referenced as "attr_018" in TTMA, as "18" or "1" in time studies
 * 
 * Steps:
 *   1. DELETE labor tables (children first)
 *   2. Import moduleAttributes 
 *   3. Upsert moduleProfiles
 *   4. Import moduleProfileModuleAttributes
 *   5. Import moduleProfileAttributes (the 112-doc collection) 
 *   6. Import taskTemplateModuleAttributes
 *   7. Import timeStudies with embedded module_attributes → timeStudyModuleAttribute
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { v5 as uuidv5 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const IMPORT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const prisma = new PrismaClient();
const serviceAccountPath = path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
}
const db = admin.firestore();

function attrRefToDocId(ref: string): string {
    if (ref.startsWith('attr_')) {
        return String(parseInt(ref.replace('attr_', ''), 10));
    }
    return ref;
}

async function main() {
    console.log('=== CLEAN RE-IMPORT: Complete Labor Estimation Data ===');
    console.log('(Read-only on Firestore — writes only to local Postgres)\n');

    // =========================================================================
    // STEP 1 — DELETE (children first)
    // =========================================================================
    console.log('--- Step 1: Deleting existing local data ---');
    const del = async (label: string, fn: () => Promise<any>) => {
        try { const r = await fn(); console.log(`  🗑  ${label}: deleted ${r.count} rows`); }
        catch (e: any) { console.log(`  ⚠  ${label}: ${e.message}`); }
    };

    await del('time_study_module_attribute', () => prisma.timeStudyModuleAttribute.deleteMany({}));
    await del('module_profile_module_attribute', () => prisma.moduleProfileModuleAttribute.deleteMany({}));
    await del('task_template_module_attribute', () => prisma.taskTemplateModuleAttribute.deleteMany({}));
    await del('time_study', () => prisma.timeStudy.deleteMany({}));
    await del('module_attribute', () => prisma.moduleAttribute.deleteMany({}));
    console.log('  ✅ Local tables cleared.\n');

    // =========================================================================
    // STEP 2 — Import Module Attributes
    // =========================================================================
    console.log('--- Step 2: Module Attributes ---');
    const maSnap = await db.collection('moduleAttributes').get();
    console.log(`  Firestore: ${maSnap.size} docs`);

    const attrLookup = new Map<string, string>(); // every alias → DB UUID
    let maCreated = 0;

    for (const doc of maSnap.docs) {
        const data = doc.data();
        const dbId = uuidv5(`moduleAttribute:${doc.id}`, IMPORT_NAMESPACE);

        // Register aliases
        attrLookup.set(doc.id, dbId);                                   // "18"
        attrLookup.set(`attr_${doc.id.padStart(3, '0')}`, dbId);        // "attr_018"
        if (data.id != null) {
            const sid = String(data.id);
            attrLookup.set(sid, dbId);
            attrLookup.set(`attr_${sid.padStart(3, '0')}`, dbId);
        }

        await prisma.moduleAttribute.create({
            data: { id: dbId, name: data.name || doc.id, moduleAttributeType: 'number' }
        });
        maCreated++;
    }
    console.log(`  ✅ ${maCreated} created (${attrLookup.size} lookup entries)\n`);

    // =========================================================================
    // STEP 3 — Upsert Module Profiles
    // =========================================================================
    console.log('--- Step 3: Module Profiles (upsert) ---');
    const mpSnap = await db.collection('moduleProfiles').get();
    console.log(`  Firestore: ${mpSnap.size} docs`);

    const fsProfileIdToDbId = new Map<string, string>();
    const profileNameToDbId = new Map<string, string>();
    let mpCreated = 0;

    for (const doc of mpSnap.docs) {
        const data = doc.data();
        const dbId = uuidv5(`moduleProfile:${doc.id}`, IMPORT_NAMESPACE);
        fsProfileIdToDbId.set(doc.id, dbId);
        const name = data.name || doc.id;
        profileNameToDbId.set(name, dbId);

        try {
            await prisma.moduleProfile.upsert({
                where: { id: dbId },
                update: { name },
                create: { id: dbId, name }
            });
            mpCreated++;
        } catch (e: any) {
            console.warn(`  ⚠ Profile ${doc.id}: ${e.message}`);
        }
    }
    console.log(`  ✅ ${mpCreated} upserted\n`);

    // =========================================================================
    // STEP 4 — Import moduleProfileModuleAttributes (1580 docs)
    // =========================================================================
    console.log('--- Step 4: Module Profile Module Attributes (main collection) ---');
    const mpmaSnap = await db.collection('moduleProfileModuleAttributes').get();
    console.log(`  Firestore: ${mpmaSnap.size} docs`);

    let mpmaCreated = 0, mpmaSkipped = 0;
    for (const doc of mpmaSnap.docs) {
        const data = doc.data();
        const dbId = uuidv5(`mpma:${doc.id}`, IMPORT_NAMESPACE);
        const dbProfileId = fsProfileIdToDbId.get(data.moduleProfileId);
        if (!dbProfileId) { mpmaSkipped++; continue; }
        const rawAttrRef = data.moduleAttributeId;
        const dbAttrId = attrLookup.get(rawAttrRef) || attrLookup.get(attrRefToDocId(rawAttrRef));
        if (!dbAttrId) { mpmaSkipped++; continue; }

        try {
            await prisma.moduleProfileModuleAttribute.create({
                data: { id: dbId, moduleProfileId: dbProfileId, moduleAttributeId: dbAttrId, value: String(data.value ?? '0') }
            });
            mpmaCreated++;
        } catch (e: any) { mpmaSkipped++; }
    }
    console.log(`  ✅ ${mpmaCreated} created, ${mpmaSkipped} skipped\n`);

    // =========================================================================
    // STEP 5 — Import moduleProfileAttributes (112 docs) — the SECOND collection
    // Uses SHORT profile IDs like "2603-A02" matched to profiles by name-contains
    // =========================================================================
    console.log('--- Step 5: Module Profile Attributes (secondary collection, 112 docs) ---');
    const mpaSnap = await db.collection('moduleProfileAttributes').get();
    console.log(`  Firestore: ${mpaSnap.size} docs`);

    // Build a lookup from short ID ("2603-A02") to DB profile IDs
    // Module profiles have names like "Crossing (2603-A02)" — extract the code
    const shortIdToDbProfileId = new Map<string, string>();
    for (const [name, dbId] of profileNameToDbId) {
        // Extract code from parentheses: "Crossing (2603-A02)" → "2603-A02"
        const match = name.match(/\(([^)]+)\)/);
        if (match) {
            shortIdToDbProfileId.set(match[1], dbId);
        }
        // Also try the raw name
        shortIdToDbProfileId.set(name, dbId);
    }
    console.log(`  Short ID lookup: ${shortIdToDbProfileId.size} entries`);

    let mpaCreated = 0, mpaSkipped = 0;
    for (const doc of mpaSnap.docs) {
        const data = doc.data();
        const dbId = uuidv5(`mpa:${doc.id}`, IMPORT_NAMESPACE);

        // Resolve profile
        const profileShortId = data.moduleProfileId;
        const dbProfileId = shortIdToDbProfileId.get(profileShortId);
        if (!dbProfileId) {
            mpaSkipped++;
            continue;
        }

        // Resolve attribute
        const rawAttrId = String(data.attributeId);
        const dbAttrId = attrLookup.get(rawAttrId) || attrLookup.get(attrRefToDocId(rawAttrId));
        if (!dbAttrId) {
            mpaSkipped++;
            continue;
        }

        try {
            await prisma.moduleProfileModuleAttribute.upsert({
                where: { id: dbId },
                update: { value: String(data.value ?? '0') },
                create: { id: dbId, moduleProfileId: dbProfileId, moduleAttributeId: dbAttrId, value: String(data.value ?? '0') }
            });
            mpaCreated++;
        } catch (e: any) { mpaSkipped++; }
    }
    console.log(`  ✅ ${mpaCreated} created/updated, ${mpaSkipped} skipped\n`);

    // =========================================================================
    // STEP 6 — Import Task Template Module Attributes  
    // =========================================================================
    console.log('--- Step 6: Task Template Module Attributes ---');
    const ttmaSnap = await db.collection('taskTemplateModuleAttributes').get();
    console.log(`  Firestore: ${ttmaSnap.size} docs`);

    const dbTTIds = new Set((await prisma.taskTemplate.findMany({ select: { id: true } })).map(t => t.id));

    let ttmaCreated = 0, ttmaSkipped = 0;
    for (const doc of ttmaSnap.docs) {
        const data = doc.data();
        const dbId = uuidv5(`ttma:${doc.id}`, IMPORT_NAMESPACE);
        const dbTTId = uuidv5(data.taskTemplateId, IMPORT_NAMESPACE);
        if (!dbTTIds.has(dbTTId)) { ttmaSkipped++; continue; }
        const rawAttrRef = data.moduleAttributeId;
        const dbAttrId = attrLookup.get(rawAttrRef) || attrLookup.get(attrRefToDocId(rawAttrRef));
        if (!dbAttrId) { ttmaSkipped++; continue; }

        try {
            await prisma.taskTemplateModuleAttribute.create({
                data: { id: dbId, taskTemplateId: dbTTId, moduleAttributeId: dbAttrId }
            });
            ttmaCreated++;
        } catch (e: any) { ttmaSkipped++; }
    }
    console.log(`  ✅ ${ttmaCreated} created, ${ttmaSkipped} skipped\n`);

    // =========================================================================
    // STEP 7 — Import Time Studies + embedded module_attributes
    // The module_attributes field contains ATTRIBUTE ID STRINGS (e.g., ["18", "1"])
    // telling us which attributes are relevant to this study.
    // We import these as TimeStudyModuleAttribute rows.
    // =========================================================================
    console.log('--- Step 7: Time Studies + module_attributes ---');
    const tsSnap = await db.collection('timeStudies').get();
    console.log(`  Firestore: ${tsSnap.size} docs`);

    let tsCreated = 0, tsSkipped = 0, tsmaCreated = 0, tsmaSkipped = 0;
    for (const doc of tsSnap.docs) {
        const data = doc.data();
        const timeStudyId = uuidv5(`timeStudy:${doc.id}`, IMPORT_NAMESPACE);

        // Resolve task_template → Firestore doc ID
        let fsTemplateDocId: string | null = null;
        const ttRef = data.task_template;
        if (ttRef && typeof ttRef === 'object' && typeof ttRef.path === 'string') {
            fsTemplateDocId = ttRef.path.split('/').pop() || null;
        } else if (typeof ttRef === 'string') {
            fsTemplateDocId = ttRef;
        }
        if (!fsTemplateDocId && data.task_code) {
            fsTemplateDocId = String(data.task_code);
        }

        if (!fsTemplateDocId) { tsSkipped++; continue; }

        const dbTTId = uuidv5(fsTemplateDocId, IMPORT_NAMESPACE);
        if (!dbTTIds.has(dbTTId)) { tsSkipped++; continue; }

        const clockTime = data.clock_time ?? data.clockTime ?? null;
        const workerCount = data.worker_count ?? data.workerCount ?? null;

        try {
            await prisma.timeStudy.create({
                data: {
                    id: timeStudyId,
                    taskTemplateId: dbTTId,
                    clockTime: clockTime != null ? parseFloat(String(clockTime)) : null,
                    workerCount: workerCount != null ? parseInt(String(workerCount)) : null,
                    notes: data.description || null
                }
            });
            tsCreated++;

            // Import module_attributes as TimeStudyModuleAttribute
            // These are attribute ID strings like ["18", "1", "5"]
            const attrIds = data.module_attributes || data.moduleAttributes || data.module_attribute_ids || [];
            if (Array.isArray(attrIds)) {
                for (let i = 0; i < attrIds.length; i++) {
                    const rawId = String(attrIds[i]);
                    const dbAttrId = attrLookup.get(rawId) || attrLookup.get(attrRefToDocId(rawId));
                    if (!dbAttrId) { tsmaSkipped++; continue; }

                    const tsmaId = uuidv5(`tsma:${doc.id}_${i}`, IMPORT_NAMESPACE);
                    try {
                        await prisma.timeStudyModuleAttribute.create({
                            data: {
                                id: tsmaId,
                                timeStudyId,
                                moduleAttributeId: dbAttrId,
                                value: '0' // No value stored — just marks the attribute as relevant
                            }
                        });
                        tsmaCreated++;
                    } catch { tsmaSkipped++; }
                }
            }
        } catch (e: any) { tsSkipped++; }
    }
    console.log(`  ✅ TimeStudies: ${tsCreated} created, ${tsSkipped} skipped`);
    console.log(`  ✅ TimeStudyModuleAttributes: ${tsmaCreated} created, ${tsmaSkipped} skipped\n`);

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('=== FINAL DB COUNTS ===');
    const counts = {
        module_attribute: await prisma.moduleAttribute.count(),
        module_profile: await prisma.moduleProfile.count(),
        module_profile_module_attribute: await prisma.moduleProfileModuleAttribute.count(),
        task_template_module_attribute: await prisma.taskTemplateModuleAttribute.count(),
        time_study: await prisma.timeStudy.count(),
        time_study_module_attribute: await prisma.timeStudyModuleAttribute.count()
    };
    console.log(JSON.stringify(counts, null, 2));
    console.log('\n✅ DONE — All labor estimation data imported.');

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message, e.stack); process.exit(1); });
