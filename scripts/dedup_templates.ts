/**
 * DEDUPLICATE TASK TEMPLATES (v2) — BY NAME MATCHING
 * 
 * The numeric (1-73) and hash templates share the same names.
 * This script:
 *   1. For each numeric template, finds a hash template with the SAME name
 *   2. Migrates tasks, time studies (+ TSMAs) from numeric → hash
 *   3. Deletes the numeric templates
 *
 * READ-ONLY on Firestore. Writes to local Postgres only.
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

async function main() {
    console.log('=== DEDUPLICATE TASK TEMPLATES (v2 — by name) ===\n');

    // =====================================================
    // Step 1: Get Firestore template info
    // =====================================================
    console.log('--- Step 1: Firestore template analysis ---');
    const ttSnap = await db.collection('taskTemplates').get();

    const numericByName = new Map<string, string>(); // name → numeric docId
    const hashByName = new Map<string, string>();    // name → hash docId (first found)

    for (const doc of ttSnap.docs) {
        const name = doc.data().name;
        if (/^\d+$/.test(doc.id)) {
            numericByName.set(name, doc.id);
        } else {
            // Only keep first hash for each name
            if (!hashByName.has(name)) {
                hashByName.set(name, doc.id);
            }
        }
    }

    console.log(`  Unique numeric names: ${numericByName.size}`);
    console.log(`  Unique hash names: ${hashByName.size}`);

    // Build numeric→hash by name
    const numericToHash = new Map<string, { numDocId: string; hashDocId: string; name: string }>();
    const unmatchedNumeric: string[] = [];

    for (const [name, numDocId] of numericByName) {
        const hashDocId = hashByName.get(name);
        if (hashDocId) {
            numericToHash.set(numDocId, { numDocId, hashDocId, name });
        } else {
            unmatchedNumeric.push(`${numDocId} (${name})`);
        }
    }

    console.log(`  Matched by name: ${numericToHash.size}`);
    console.log(`  Unmatched numeric: ${unmatchedNumeric.length}`);
    if (unmatchedNumeric.length > 0) {
        unmatchedNumeric.forEach(u => console.log(`    ⚠ ${u}`));
    }

    // =====================================================
    // Step 2: Ensure all hash targets exist in DB
    // =====================================================
    console.log('\n--- Step 2: Ensure hash templates exist in DB ---');
    const existingDbIds = new Set(
        (await prisma.taskTemplate.findMany({ select: { id: true } })).map(t => t.id)
    );

    let imported = 0;
    for (const { hashDocId, name } of numericToHash.values()) {
        const hashDbId = uuidv5(hashDocId, IMPORT_NAMESPACE);
        if (!existingDbIds.has(hashDbId)) {
            const fsData = ttSnap.docs.find(d => d.id === hashDocId)?.data();
            await prisma.taskTemplate.create({
                data: {
                    id: hashDbId,
                    name,
                    description: fsData?.description || null,
                    minWorkers: fsData?.min_workers != null ? parseInt(String(fsData.min_workers)) : null,
                    maxWorkers: fsData?.max_workers != null ? parseInt(String(fsData.max_workers)) : null
                }
            });
            existingDbIds.add(hashDbId);
            imported++;
        }
    }
    console.log(`  Imported ${imported} missing hash templates`);

    // =====================================================
    // Step 3: Migrate time studies
    // =====================================================
    console.log('\n--- Step 3: Migrate time studies (numeric → hash) ---');
    let tsMigrated = 0, tsOrphaned = 0;

    for (const [numDocId, mapping] of numericToHash) {
        const numDbId = uuidv5(numDocId, IMPORT_NAMESPACE);
        const hashDbId = uuidv5(mapping.hashDocId, IMPORT_NAMESPACE);

        const updated = await prisma.timeStudy.updateMany({
            where: { taskTemplateId: numDbId },
            data: { taskTemplateId: hashDbId }
        });
        tsMigrated += updated.count;
    }

    // Count orphaned (on unmatched numeric templates)
    for (const u of unmatchedNumeric) {
        const numDocId = u.split(' ')[0];
        const numDbId = uuidv5(numDocId, IMPORT_NAMESPACE);
        const count = await prisma.timeStudy.count({ where: { taskTemplateId: numDbId } });
        tsOrphaned += count;
    }
    console.log(`  Migrated: ${tsMigrated}, Still on unmatched: ${tsOrphaned}`);

    // =====================================================
    // Step 4: Migrate tasks
    // =====================================================
    console.log('\n--- Step 4: Migrate tasks (numeric → hash) ---');
    let tasksMigrated = 0, tasksOrphaned = 0;

    for (const [numDocId, mapping] of numericToHash) {
        const numDbId = uuidv5(numDocId, IMPORT_NAMESPACE);
        const hashDbId = uuidv5(mapping.hashDocId, IMPORT_NAMESPACE);

        const updated = await prisma.task.updateMany({
            where: { taskTemplateId: numDbId },
            data: { taskTemplateId: hashDbId }
        });
        tasksMigrated += updated.count;
    }

    for (const u of unmatchedNumeric) {
        const numDocId = u.split(' ')[0];
        const numDbId = uuidv5(numDocId, IMPORT_NAMESPACE);
        const count = await prisma.task.count({ where: { taskTemplateId: numDbId } });
        tasksOrphaned += count;
    }
    console.log(`  Migrated: ${tasksMigrated}, Still on unmatched: ${tasksOrphaned}`);

    // =====================================================
    // Step 5: Delete numeric templates
    // =====================================================
    console.log('\n--- Step 5: Delete numeric templates ---');

    const numericDbIds = [...numericByName.values()].map(id => uuidv5(id, IMPORT_NAMESPACE));

    // Delete linked TTMAs (shouldn't have any, but just in case)
    const delTTMA = await prisma.taskTemplateModuleAttribute.deleteMany({
        where: { taskTemplateId: { in: numericDbIds } }
    });
    console.log(`  Deleted ${delTTMA.count} TTMAs on numeric templates`);

    // For unmatched templates that still have tasks/TS — keep them
    const idsWithDeps: string[] = [];
    const idsToDelete: string[] = [];

    for (const dbId of numericDbIds) {
        const taskCount = await prisma.task.count({ where: { taskTemplateId: dbId } });
        const tsCount = await prisma.timeStudy.count({ where: { taskTemplateId: dbId } });
        if (taskCount > 0 || tsCount > 0) {
            idsWithDeps.push(dbId);
        } else {
            idsToDelete.push(dbId);
        }
    }

    const deleted = await prisma.taskTemplate.deleteMany({
        where: { id: { in: idsToDelete } }
    });
    console.log(`  Deleted: ${deleted.count} numeric templates`);
    console.log(`  Kept: ${idsWithDeps.length} (still have tasks/time studies — unmatched by name)`);

    // =====================================================
    // Final Summary
    // =====================================================
    console.log('\n=== FINAL COUNTS ===');
    const counts = {
        taskTemplates: await prisma.taskTemplate.count(),
        tasks: await prisma.task.count(),
        timeStudies: await prisma.timeStudy.count(),
        timeStudyModuleAttributes: await prisma.timeStudyModuleAttribute.count(),
        taskTemplateModuleAttributes: await prisma.taskTemplateModuleAttribute.count()
    };
    console.log(JSON.stringify(counts, null, 2));

    // Show merged confirmation
    console.log('\n--- Verify: hash templates with BOTH time studies AND TTMAs ---');
    const hashDbIds = [...numericToHash.values()].map(m => uuidv5(m.hashDocId, IMPORT_NAMESPACE));
    const withBoth = await prisma.taskTemplate.findMany({
        where: {
            id: { in: hashDbIds },
            timeStudies: { some: {} },
            taskTemplateModuleAttributes: { some: {} }
        },
        select: { id: true, name: true, _count: { select: { timeStudies: true, taskTemplateModuleAttributes: true } } }
    });
    console.log(`  Templates with BOTH TS and TTMA: ${withBoth.length}`);
    withBoth.forEach(t => console.log(`    "${t.name}": ${t._count.timeStudies} TS, ${t._count.taskTemplateModuleAttributes} TTMAs`));

    console.log('\n✅ DONE');
    await prisma.$disconnect();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
