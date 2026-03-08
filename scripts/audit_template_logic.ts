/**
 * AUDIT TEMPLATE ATTRIBUTE LOGIC
 *
 * Lists all task templates and their assigned attributes.
 * This allows a human to verify if the relationships make sense.
 * e.g. Does "Install Door Handle" actually link to "Number of Doors"?
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { v5 as uuidv5 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('=== AUDIT TEMPLATE ATTRIBUTE LOGIC ===\n');

    const templates = await prisma.taskTemplate.findMany({
        include: {
            taskTemplateModuleAttributes: {
                include: { moduleAttribute: true }
            }
        },
        orderBy: { name: 'asc' }
    });

    let senselessCount = 0;
    let sensibleCount = 0;
    let noAttrCount = 0;

    for (const t of templates) {
        const attrs = t.taskTemplateModuleAttributes.map(ttma => ttma.moduleAttribute.name);

        if (attrs.length === 0) {
            console.log(`⚪ [No Attrs] ${t.name}`);
            noAttrCount++;
        } else {
            console.log(`🔹 [Has Attrs] ${t.name}`);
            attrs.forEach(a => console.log(`    - ${a}`));
            sensibleCount++;
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total Templates: ${templates.length}`);
    console.log(`With Attributes: ${sensibleCount}`);
    console.log(`No Attributes: ${noAttrCount}`);

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
