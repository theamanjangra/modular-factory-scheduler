// Quick debug script to inspect DB IDs and Firestore ID mapping
import { PrismaClient } from '@prisma/client';
import { v5 as uuidv5 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const IMPORT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

async function main() {
    const prisma = new PrismaClient();

    // Check existing DB IDs
    const mp = await prisma.moduleProfile.findMany({ take: 3, select: { id: true, name: true } });
    console.log('DB ModuleProfiles:', JSON.stringify(mp, null, 2));

    const tt = await prisma.taskTemplate.findMany({ take: 3, select: { id: true, name: true } });
    console.log('DB TaskTemplates:', JSON.stringify(tt, null, 2));

    const ma = await prisma.moduleAttribute.findMany({ take: 5, select: { id: true, name: true } });
    console.log('DB ModuleAttributes:', JSON.stringify(ma, null, 2));

    // Check if Firestore IDs match DB IDs directly (before UUID conversion)
    // Firestore MPMA has moduleProfileId = "bd257b731fa..."
    const testFsProfileId = 'bd257b731fa517d3d2eba0d7619a1e14b750c5f9d8078228a639d60c2d2d513a';
    const testFsTemplateId = '4694bbee54776747aa62fdd64a933c2655252af38110eb4e9f7ceabf7104b903';

    // Check how the original import script maps Firestore IDs to DB UUIDs
    const profileUUID = uuidv5(`moduleProfile:${testFsProfileId}`, IMPORT_NAMESPACE);
    const templateUUID = uuidv5(`taskTemplate:${testFsTemplateId}`, IMPORT_NAMESPACE);
    const attrUUID = uuidv5(`moduleAttribute:attr_006`, IMPORT_NAMESPACE);

    console.log('\n--- UUID Mapping Test ---');
    console.log(`Firestore moduleProfileId: ${testFsProfileId}`);
    console.log(`  -> UUID: ${profileUUID}`);
    console.log(`  -> Exists in DB? ${mp.some(m => m.id === profileUUID)}`);

    console.log(`Firestore taskTemplateId: ${testFsTemplateId}`);
    console.log(`  -> UUID: ${templateUUID}`);
    console.log(`  -> Exists in DB? ${tt.some(t => t.id === templateUUID)}`);

    console.log(`Firestore moduleAttributeId: attr_006`);
    console.log(`  -> UUID: ${attrUUID}`);
    console.log(`  -> Exists in DB? ${ma.some(m => m.id === attrUUID)}`);

    // Also check what prefixes the original import used
    // Look at what's in moduleProfiles collection in Firestore
    // The original script imports from 'workers' and 'taskTemplates' — need to check if moduleProfiles 
    // were imported with same uuidv5 pattern

    // Try direct Firestore doc IDs as-is (some projects use raw Firestore IDs)
    const directProfileMatch = await prisma.moduleProfile.findUnique({ where: { id: testFsProfileId } });
    console.log(`\nDirect match moduleProfile(${testFsProfileId.substring(0, 20)}...): ${directProfileMatch ? 'YES' : 'NO'}`);

    const directTemplateMatch = await prisma.taskTemplate.findUnique({ where: { id: testFsTemplateId } });
    console.log(`Direct match taskTemplate(${testFsTemplateId.substring(0, 20)}...): ${directTemplateMatch ? 'YES' : 'NO'}`);

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
