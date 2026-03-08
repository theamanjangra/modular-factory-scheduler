/**
 * FIND MISSING DATA: For each template missing TS or TTMAs,
 * search Firestore by name to find them.
 */
import * as admin from 'firebase-admin';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const serviceAccountPath = path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
}
const db = admin.firestore();

async function main() {
    console.log('=== FIND MISSING TS/TTMA DATA IN FIRESTORE ===\n');

    // Get local DB state
    const templates = await prisma.taskTemplate.findMany({
        select: {
            id: true, name: true,
            _count: { select: { timeStudies: true, taskTemplateModuleAttributes: true } }
        }
    });

    const missingTS = templates.filter(t => t._count.timeStudies === 0);
    const missingTTMA = templates.filter(t => t._count.taskTemplateModuleAttributes === 0);

    console.log(`Templates missing Time Studies: ${missingTS.length}`);
    missingTS.forEach(t => console.log(`  ❌ TS: "${t.name}"`));
    console.log(`\nTemplates missing TTMAs: ${missingTTMA.length}`);
    missingTTMA.forEach(t => console.log(`  ❌ TTMA: "${t.name}"`));

    // Load ALL Firestore data
    console.log('\n--- Loading Firestore data ---');
    const fsTemplates = await db.collection('taskTemplates').get();
    const fsTimeStudies = await db.collection('timeStudies').get();
    const fsTTMAs = await db.collection('taskTemplateModuleAttributes').get();

    // Build Firestore lookups
    // Templates: name → array of doc IDs
    const fsTemplatesByName = new Map<string, string[]>();
    const fsTemplateIdToName = new Map<string, string>();
    for (const doc of fsTemplates.docs) {
        const name = doc.data().name;
        fsTemplateIdToName.set(doc.id, name);
        const list = fsTemplatesByName.get(name) || [];
        list.push(doc.id);
        fsTemplatesByName.set(name, list);
    }

    // Time Studies: template ref → array of time study docs
    const fsTimeStudiesByTemplateId = new Map<string, any[]>();
    for (const doc of fsTimeStudies.docs) {
        const data = doc.data();
        let ttId: string | null = null;
        const ttRef = data.task_template;
        if (ttRef && typeof ttRef === 'object' && typeof ttRef.path === 'string') {
            ttId = ttRef.path.split('/').pop() || null;
        }
        if (!ttId && data.task_code) ttId = String(data.task_code);
        if (!ttId) continue;

        const list = fsTimeStudiesByTemplateId.get(ttId) || [];
        list.push({ docId: doc.id, ...data });
        fsTimeStudiesByTemplateId.set(ttId, list);
    }

    // TTMAs: templateId → array of TTMA docs
    const fsTTMAsByTemplateId = new Map<string, any[]>();
    for (const doc of fsTTMAs.docs) {
        const data = doc.data();
        const ttId = data.taskTemplateId;
        if (!ttId) continue;
        const list = fsTTMAsByTemplateId.get(ttId) || [];
        list.push({ docId: doc.id, ...data });
        fsTTMAsByTemplateId.set(ttId, list);
    }

    // Now search for missing data
    console.log('\n\n=== SEARCH RESULTS ===');

    console.log('\n--- Templates missing Time Studies ---');
    for (const t of missingTS) {
        const fsDocIds = fsTemplatesByName.get(t.name) || [];
        console.log(`\n  "${t.name}" — ${fsDocIds.length} Firestore template docs:`);

        let foundTS = false;
        for (const fsId of fsDocIds) {
            const studies = fsTimeStudiesByTemplateId.get(fsId) || [];
            if (studies.length > 0) {
                console.log(`    ✅ Template ${fsId} has ${studies.length} time studies:`);
                for (const ts of studies) {
                    console.log(`      clock_time=${ts.clock_time}, worker_count=${ts.worker_count}, desc="${ts.description}"`);
                    console.log(`        module_attributes: ${JSON.stringify(ts.module_attributes || [])}`);
                }
                foundTS = true;
            }
        }

        // Also search by name via description in time studies
        if (!foundTS) {
            // Check if ANY time study has description matching this template name
            const byDesc: any[] = [];
            for (const doc of fsTimeStudies.docs) {
                const d = doc.data();
                if (d.description && d.description.toLowerCase() === t.name.toLowerCase()) {
                    byDesc.push({ docId: doc.id, ...d });
                }
            }
            if (byDesc.length > 0) {
                console.log(`    ✅ Found ${byDesc.length} time studies by description match:`);
                for (const ts of byDesc) {
                    const ttRef = ts.task_template?.path || 'N/A';
                    console.log(`      clock_time=${ts.clock_time}, worker_count=${ts.worker_count}, task_template=${ttRef}`);
                    console.log(`        module_attributes: ${JSON.stringify(ts.module_attributes || [])}`);
                }
                foundTS = true;
            }
        }

        if (!foundTS) {
            console.log(`    ❌ NO time studies found anywhere in Firestore`);
        }
    }

    console.log('\n\n--- Templates missing TTMAs ---');
    for (const t of missingTTMA) {
        const fsDocIds = fsTemplatesByName.get(t.name) || [];
        console.log(`\n  "${t.name}" — ${fsDocIds.length} Firestore template docs:`);

        let foundTTMA = false;
        for (const fsId of fsDocIds) {
            const ttmas = fsTTMAsByTemplateId.get(fsId) || [];
            if (ttmas.length > 0) {
                console.log(`    ✅ Template ${fsId} has ${ttmas.length} TTMAs:`);
                for (const ttma of ttmas) {
                    console.log(`      moduleAttributeId: ${ttma.moduleAttributeId}`);
                }
                foundTTMA = true;
            }
        }

        // Also check the template's own module_attributes field
        if (!foundTTMA) {
            for (const fsId of fsDocIds) {
                const fsDoc = fsTemplates.docs.find(d => d.id === fsId);
                const attrs = fsDoc?.data()?.module_attributes;
                if (Array.isArray(attrs) && attrs.length > 0) {
                    console.log(`    ✅ Template ${fsId} has module_attributes field: ${JSON.stringify(attrs)}`);
                    foundTTMA = true;
                }
                // Also check attribute_codes
                const attrCodes = fsDoc?.data()?.attribute_codes;
                if (Array.isArray(attrCodes) && attrCodes.length > 0) {
                    console.log(`    ✅ Template ${fsId} has attribute_codes field: ${JSON.stringify(attrCodes)}`);
                    foundTTMA = true;
                }
            }
        }

        if (!foundTTMA) {
            console.log(`    ❌ NO TTMAs found anywhere in Firestore`);
        }
    }

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
