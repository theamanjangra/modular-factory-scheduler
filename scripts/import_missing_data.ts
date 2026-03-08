/**
 * IMPORT MISSING: Fill gaps for templates missing TS/TTMAs
 *
 * What we found:
 * 1. 20 templates missing TTMAs — data is in the template doc's
 *    `attribute_codes` or `module_attributes` fields (DocumentReferences to moduleAttributes)
 * 2. 2 templates missing Time Studies — found by description match
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

function resolveAttrId(raw: string): string {
    // "attr_018" → "18", or just return as-is
    if (raw.startsWith('attr_')) return String(parseInt(raw.replace('attr_', ''), 10));
    return raw;
}

async function main() {
    console.log('=== IMPORT MISSING TS/TTMA DATA ===\n');

    // Build attribute lookup (same as import_labor_data.ts)
    const maSnap = await db.collection('moduleAttributes').get();
    const attrLookup = new Map<string, string>();
    for (const doc of maSnap.docs) {
        const dbId = uuidv5(`moduleAttribute:${doc.id}`, IMPORT_NAMESPACE);
        const data = doc.data();
        attrLookup.set(doc.id, dbId);
        attrLookup.set(`attr_${doc.id.padStart(3, '0')}`, dbId);
        if (data.id != null) {
            const sid = String(data.id);
            attrLookup.set(sid, dbId);
            attrLookup.set(`attr_${sid.padStart(3, '0')}`, dbId);
        }
    }

    // Get templates missing TTMAs
    const templates = await prisma.taskTemplate.findMany({
        select: { id: true, name: true, _count: { select: { timeStudies: true, taskTemplateModuleAttributes: true } } }
    });
    const missingTTMA = templates.filter(t => t._count.taskTemplateModuleAttributes === 0);
    const missingTS = templates.filter(t => t._count.timeStudies === 0);

    console.log(`Templates missing TTMAs: ${missingTTMA.length}`);
    console.log(`Templates missing Time Studies: ${missingTS.length}\n`);

    // Load Firestore templates
    const fsTemplates = await db.collection('taskTemplates').get();
    const fsTemplatesByName = new Map<string, any[]>();
    for (const doc of fsTemplates.docs) {
        const name = doc.data().name;
        const list = fsTemplatesByName.get(name) || [];
        list.push({ docId: doc.id, ...doc.data() });
        fsTemplatesByName.set(name, list);
    }

    // =====================================================
    // PART 1: Import missing TTMAs from template docs
    // =====================================================
    console.log('--- Part 1: Import TTMAs from template attribute_codes/module_attributes ---');
    let ttmaCreated = 0;

    for (const t of missingTTMA) {
        const fsDocs = fsTemplatesByName.get(t.name) || [];
        const attrIds = new Set<string>();

        for (const fsDoc of fsDocs) {
            // From attribute_codes (simple string array like ["18", "5"])
            if (Array.isArray(fsDoc.attribute_codes)) {
                for (const code of fsDoc.attribute_codes) {
                    attrIds.add(String(code));
                }
            }

            // From module_attributes (DocumentReferences: segments["moduleAttributes","3"])
            if (Array.isArray(fsDoc.module_attributes)) {
                for (const ref of fsDoc.module_attributes) {
                    if (ref && ref._path && ref._path.segments) {
                        const segs = ref._path.segments;
                        if (segs[0] === 'moduleAttributes' && segs[1]) {
                            attrIds.add(String(segs[1]));
                        }
                    }
                    // Also handle plain strings
                    if (typeof ref === 'string') {
                        attrIds.add(resolveAttrId(ref));
                    }
                }
            }
        }

        if (attrIds.size === 0) {
            console.log(`  ❌ "${t.name}": no attribute codes found`);
            continue;
        }

        // Create TTMAs
        for (const rawId of attrIds) {
            const dbAttrId = attrLookup.get(rawId) || attrLookup.get(resolveAttrId(rawId));
            if (!dbAttrId) {
                console.log(`  ⚠ "${t.name}": attr "${rawId}" not in lookup`);
                continue;
            }

            const ttmaId = uuidv5(`ttma_fill:${t.id}_${rawId}`, IMPORT_NAMESPACE);
            try {
                await prisma.taskTemplateModuleAttribute.upsert({
                    where: { id: ttmaId },
                    update: {},
                    create: { id: ttmaId, taskTemplateId: t.id, moduleAttributeId: dbAttrId }
                });
                ttmaCreated++;
            } catch (e: any) {
                console.log(`  ⚠ "${t.name}": failed to create TTMA for attr ${rawId}: ${e.message}`);
            }
        }
        console.log(`  ✅ "${t.name}": ${attrIds.size} TTMAs`);
    }
    console.log(`\nTotal TTMAs created: ${ttmaCreated}\n`);

    // =====================================================
    // PART 2: Import missing Time Studies
    // =====================================================
    console.log('--- Part 2: Import Time Studies for templates that are missing them ---');
    const fsTimeStudies = await db.collection('timeStudies').get();

    // Build TS by description (for name matching)
    const tsByDescription = new Map<string, any[]>();
    for (const doc of fsTimeStudies.docs) {
        const d = doc.data();
        const desc = (d.description || '').trim().toLowerCase();
        const list = tsByDescription.get(desc) || [];
        list.push({ docId: doc.id, ...d });
        tsByDescription.set(desc, list);
    }

    // Also build TS by template ref
    const tsByTemplateRef = new Map<string, any[]>();
    for (const doc of fsTimeStudies.docs) {
        const d = doc.data();
        let ttId: string | null = null;
        if (d.task_template?.path) ttId = d.task_template.path.split('/').pop();
        if (!ttId && d.task_code) ttId = String(d.task_code);
        if (ttId) {
            const list = tsByTemplateRef.get(ttId) || [];
            list.push({ docId: doc.id, ...d });
            tsByTemplateRef.set(ttId, list);
        }
    }

    let tsCreated = 0, tsmaCreated = 0;

    for (const t of missingTS) {
        // Strategy 1: Find via Firestore template doc IDs
        const fsDocs = fsTemplatesByName.get(t.name) || [];
        let foundStudies: any[] = [];

        for (const fsDoc of fsDocs) {
            const studies = tsByTemplateRef.get(fsDoc.docId) || [];
            foundStudies.push(...studies);
        }

        // Strategy 2: Match by description
        if (foundStudies.length === 0) {
            const byDesc = tsByDescription.get(t.name.toLowerCase()) || [];
            foundStudies.push(...byDesc);
        }

        if (foundStudies.length === 0) {
            console.log(`  ❌ "${t.name}": no time studies found`);
            continue;
        }

        // Deduplicate by docId
        const seen = new Set<string>();
        foundStudies = foundStudies.filter(s => { if (seen.has(s.docId)) return false; seen.add(s.docId); return true; });

        for (const ts of foundStudies) {
            const tsId = uuidv5(`timeStudy_fill:${ts.docId}`, IMPORT_NAMESPACE);
            const clockTime = ts.clock_time ?? ts.clockTime ?? null;
            const workerCount = ts.worker_count ?? ts.workerCount ?? null;

            try {
                await prisma.timeStudy.upsert({
                    where: { id: tsId },
                    update: {},
                    create: {
                        id: tsId,
                        taskTemplateId: t.id,
                        clockTime: clockTime != null ? parseFloat(String(clockTime)) : null,
                        workerCount: workerCount != null ? parseInt(String(workerCount)) : null,
                        notes: ts.description || null
                    }
                });
                tsCreated++;

                // Import module_attributes as TSMAs
                const attrs = ts.module_attributes || ts.moduleAttributes || [];
                if (Array.isArray(attrs)) {
                    for (let i = 0; i < attrs.length; i++) {
                        const rawId = String(attrs[i]);
                        const dbAttrId = attrLookup.get(rawId) || attrLookup.get(resolveAttrId(rawId));
                        if (!dbAttrId) continue;
                        const tsmaId = uuidv5(`tsma_fill:${ts.docId}_${i}`, IMPORT_NAMESPACE);
                        try {
                            await prisma.timeStudyModuleAttribute.upsert({
                                where: { id: tsmaId },
                                update: {},
                                create: { id: tsmaId, timeStudyId: tsId, moduleAttributeId: dbAttrId, value: '0' }
                            });
                            tsmaCreated++;
                        } catch { }
                    }
                }
            } catch (e: any) {
                console.log(`  ⚠ "${t.name}": TS ${ts.docId} failed: ${e.message}`);
            }
        }
        console.log(`  ✅ "${t.name}": ${foundStudies.length} time studies`);
    }
    console.log(`\nTotal new TS: ${tsCreated}, new TSMAs: ${tsmaCreated}\n`);

    // =====================================================
    // Final counts
    // =====================================================
    console.log('=== FINAL COUNTS ===');
    const counts = {
        taskTemplates: await prisma.taskTemplate.count(),
        tasks: await prisma.task.count(),
        timeStudies: await prisma.timeStudy.count(),
        timeStudyModuleAttributes: await prisma.timeStudyModuleAttribute.count(),
        taskTemplateModuleAttributes: await prisma.taskTemplateModuleAttribute.count()
    };
    console.log(JSON.stringify(counts, null, 2));

    // Check how many have BOTH now
    const withBoth = await prisma.taskTemplate.count({
        where: { timeStudies: { some: {} }, taskTemplateModuleAttributes: { some: {} } }
    });
    const withTS = await prisma.taskTemplate.count({ where: { timeStudies: { some: {} } } });
    const withTTMA = await prisma.taskTemplate.count({ where: { taskTemplateModuleAttributes: { some: {} } } });

    console.log(`\nTemplates with Time Studies: ${withTS}/73`);
    console.log(`Templates with TTMAs: ${withTTMA}/73`);
    console.log(`Templates with BOTH: ${withBoth}/73`);

    console.log('\n✅ DONE');
    await prisma.$disconnect();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
