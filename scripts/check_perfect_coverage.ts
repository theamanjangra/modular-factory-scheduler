/**
 * ANALYZE PERFECT RATIO COVERAGE
 *
 * Checks how many templates have "perfect" data for proportional scaling.
 * "Perfect" means:
 * 1. Has Time Studies
 * 2. Has TTMAs
 * 3. The attribute IDs match (intersection > 0)
 * 4. The Time Study has a value > 0 for that attribute
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('=== PERFECT RATIO COVERAGE ANALYSIS ===\n');

    const templates = await prisma.taskTemplate.findMany({
        include: {
            timeStudies: {
                include: { timeStudyModuleAttributes: true }
            },
            taskTemplateModuleAttributes: true
        }
    });

    let perfectCount = 0;
    let partialCount = 0;
    let zeroCount = 0;

    console.log(`Analyzing ${templates.length} templates...`);

    for (const t of templates) {
        const ttmaIds = new Set(t.taskTemplateModuleAttributes.map(a => a.moduleAttributeId));
        if (ttmaIds.size === 0) {
            // No required attributes defined
            continue;
        }

        let hasValidStudy = false;

        for (const ts of t.timeStudies) {
            // Find intersection
            const tsmaMap = new Map();
            ts.timeStudyModuleAttributes.forEach(a => tsmaMap.set(a.moduleAttributeId, parseFloat(String(a.value))));

            let intersectionCount = 0;
            let validValuesCount = 0;

            for (const requiredAttr of ttmaIds) {
                if (tsmaMap.has(requiredAttr)) {
                    intersectionCount++;
                    const val = tsmaMap.get(requiredAttr);
                    if (val && val > 0) validValuesCount++; // Must have non-zero context value
                }
            }

            if (intersectionCount > 0 && validValuesCount > 0) {
                hasValidStudy = true;
                break;
            }
        }

        if (hasValidStudy) {
            perfectCount++;
            console.log(`  ✅ PERFECT: "${t.name}" (Alignment found)`);
        } else if (t.timeStudies.length > 0) {
            partialCount++;
            // detailed debug for failed alignment
            // const req = [...ttmaIds].map(id => id.substring(0,8)).join(',');
            // console.log(`  ❌ Mismatch: "${t.name}" (Req: ${req})`);
        } else {
            zeroCount++;
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total Templates: ${templates.length}`);
    console.log(`PERFECT Context (Scaling works): ${perfectCount}`);
    console.log(`ClockTime Only (Scaling fails): ${partialCount}`);
    console.log(`No Data (Default 1.0h): ${zeroCount}`);

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
