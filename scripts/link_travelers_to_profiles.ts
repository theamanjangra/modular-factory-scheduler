/**
 * Quick script to link existing dummy travelers to imported module profiles
 * that have attributes, so the labor estimation can work end-to-end.
 * 
 * The original import created 3 dummy module profiles ("Unit 1/2/3") with no
 * attributes. The labor data import created 223 real profiles with 1,580 attributes.
 * This script assigns real profiles (with attributes) to the existing travelers.
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
    const prisma = new PrismaClient();

    // 1. Find module profiles that HAVE attributes
    const profilesWithAttrs = await prisma.moduleProfile.findMany({
        where: { moduleProfileModuleAttributes: { some: {} } },
        select: { id: true, name: true, _count: { select: { moduleProfileModuleAttributes: true } } },
        orderBy: { name: 'asc' }
    });
    console.log(`Found ${profilesWithAttrs.length} profiles with attributes.`);
    profilesWithAttrs.slice(0, 5).forEach(p =>
        console.log(`  ${p.name}: ${p._count.moduleProfileModuleAttributes} attrs`)
    );

    // 2. Find travelers currently pointing to dummy profiles (ones WITHOUT attributes)
    const travelers = await prisma.traveler.findMany({
        include: {
            moduleProfile: {
                include: { _count: { select: { moduleProfileModuleAttributes: true } } }
            }
        }
    });

    const dummyTravelers = travelers.filter(t =>
        !t.moduleProfile || t.moduleProfile._count.moduleProfileModuleAttributes === 0
    );
    console.log(`\nTravelers: ${travelers.length} total, ${dummyTravelers.length} with dummy profiles.`);

    if (dummyTravelers.length === 0 || profilesWithAttrs.length === 0) {
        console.log('Nothing to update.');
        await prisma.$disconnect();
        return;
    }

    // 3. Assign real profiles round-robin to dummy travelers
    let updated = 0;
    for (let i = 0; i < dummyTravelers.length; i++) {
        const traveler = dummyTravelers[i];
        const profile = profilesWithAttrs[i % profilesWithAttrs.length];

        await prisma.traveler.update({
            where: { id: traveler.id },
            data: { moduleProfileId: profile.id }
        });
        updated++;
        console.log(`  Updated traveler ${traveler.id} → profile "${profile.name}"`);
    }

    console.log(`\n✅ Updated ${updated} travelers to reference profiles with attributes.`);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
