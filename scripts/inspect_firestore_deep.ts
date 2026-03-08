/**
 * Deep dive into:
 * 1. Time study module_attributes — what format are the values?
 * 2. moduleProfileAttributes — what's in this collection?
 * 3. Task template ID mapping — how do TTMA hash IDs relate to numeric IDs?
 * 4. travelerTemplates — do they link profiles to templates?
 * 5. workerTaskTemplates — worker-to-template assignments
 */
import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
}
const db = admin.firestore();

async function main() {
    // =====================================================
    // 1. Time Study module_attributes — detailed look
    // =====================================================
    console.log('=== TIME STUDY module_attributes (detailed) ===');
    const tsSnap = await db.collection('timeStudies').get();
    let samplesShown = 0;
    for (const doc of tsSnap.docs) {
        const data = doc.data();
        const attrs = data.module_attributes || data.moduleAttributes;
        if (Array.isArray(attrs) && attrs.length > 0) {
            if (samplesShown < 5) {
                console.log(`\n  TS docId: ${doc.id}`);
                console.log(`    description: ${data.description}`);
                console.log(`    clock_time: ${data.clock_time}`);
                console.log(`    task_code: ${data.task_code}`);
                console.log(`    module_attributes (${attrs.length} items):`);
                for (const item of attrs) {
                    const type = typeof item;
                    if (type === 'string' || type === 'number') {
                        console.log(`      - "${item}" (${type})`);
                    } else if (item && typeof item === 'object') {
                        console.log(`      - ${JSON.stringify(item)}`);
                    } else {
                        console.log(`      - ${item} (${type})`);
                    }
                }
                samplesShown++;
            }
        }
    }

    // Also check module_attribute_ids field
    console.log('\n\n=== TIME STUDY module_attribute_ids ===');
    samplesShown = 0;
    for (const doc of tsSnap.docs) {
        const data = doc.data();
        if (data.module_attribute_ids && samplesShown < 5) {
            console.log(`  TS ${doc.id}: module_attribute_ids =`, JSON.stringify(data.module_attribute_ids));
            samplesShown++;
        }
    }
    if (samplesShown === 0) console.log('  (none found)');

    // =====================================================
    // 2. moduleProfileAttributes collection
    // =====================================================
    console.log('\n\n=== moduleProfileAttributes ===');
    const mpaSnap = await db.collection('moduleProfileAttributes').get();
    console.log(`Total: ${mpaSnap.size} docs`);

    const mpaFields = new Set<string>();
    mpaSnap.docs.slice(0, 5).forEach(doc => {
        const data = doc.data();
        Object.keys(data).forEach(k => mpaFields.add(k));
        console.log(`  docId: ${doc.id}`);
        for (const [key, val] of Object.entries(data)) {
            if (val && typeof val === 'object' && 'path' in (val as any)) {
                console.log(`    ${key}: [Ref] ${(val as any).path}`);
            } else {
                console.log(`    ${key}: ${JSON.stringify(val)}`);
            }
        }
        console.log();
    });
    console.log('Fields:', [...mpaFields].sort().join(', '));

    // =====================================================
    // 3. taskTemplates — check for both hash and numeric IDs
    // =====================================================
    console.log('\n\n=== taskTemplates — ID format comparison ===');
    const ttSnap = await db.collection('taskTemplates').get();
    console.log(`Total: ${ttSnap.size} templates`);

    const numericIds: string[] = [];
    const hashIds: string[] = [];
    const nameByDocId = new Map<string, string>();

    for (const doc of ttSnap.docs) {
        nameByDocId.set(doc.id, doc.data().name);
        if (/^\d+$/.test(doc.id)) {
            numericIds.push(doc.id);
        } else {
            hashIds.push(doc.id);
        }
    }
    console.log(`  Numeric IDs: ${numericIds.length} (e.g., ${numericIds.slice(0, 5).join(', ')})`);
    console.log(`  Hash IDs: ${hashIds.length} (e.g., ${hashIds.slice(0, 3).join(', ')})`);

    // Check if same names exist under both ID types
    const numericNames = new Set(numericIds.map(id => nameByDocId.get(id)));
    const hashNames = new Set(hashIds.map(id => nameByDocId.get(id)));
    const overlap = [...numericNames].filter(n => hashNames.has(n));
    console.log(`  Names that appear in BOTH numeric and hash: ${overlap.length}`);
    if (overlap.length > 0) {
        console.log(`    Examples: ${overlap.slice(0, 5).join(', ')}`);
    }

    // Show which numeric IDs the time studies reference
    console.log('\n  Time study task_code values and their template names:');
    const taskCodes = new Set<string>();
    for (const doc of tsSnap.docs) {
        const tc = String(doc.data().task_code);
        if (tc && tc !== 'undefined') taskCodes.add(tc);
    }
    for (const code of [...taskCodes].sort((a, b) => parseInt(a) - parseInt(b))) {
        const name = nameByDocId.get(code) || 'NOT FOUND';
        console.log(`    task_code ${code}: "${name}"`);
    }

    // =====================================================
    // 4. travelerTemplates
    // =====================================================
    console.log('\n\n=== travelerTemplates ===');
    const travSnap = await db.collection('travelerTemplates').get();
    console.log(`Total: ${travSnap.size} docs`);
    travSnap.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`  docId: ${doc.id}, fields: ${Object.keys(data).join(', ')}`);
        for (const [key, val] of Object.entries(data)) {
            if (Array.isArray(val)) {
                console.log(`    ${key}: [Array] ${val.length} items`);
                if (val.length > 0) console.log(`      [0]: ${JSON.stringify(val[0]).substring(0, 150)}`);
            } else if (val && typeof val === 'object' && 'path' in (val as any)) {
                console.log(`    ${key}: [Ref] ${(val as any).path}`);
            } else {
                console.log(`    ${key}: ${JSON.stringify(val)?.substring(0, 100)}`);
            }
        }
        console.log();
    });

    // =====================================================
    // 5. workerTaskTemplates
    // =====================================================
    console.log('\n\n=== workerTaskTemplates ===');
    const wttSnap = await db.collection('workerTaskTemplates').limit(5).get();
    console.log(`Total: ${wttSnap.size}+ docs`);
    wttSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  docId: ${doc.id}, fields: ${Object.keys(data).join(', ')}`);
        for (const [key, val] of Object.entries(data)) {
            console.log(`    ${key}: ${JSON.stringify(val)?.substring(0, 150)}`);
        }
    });

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
