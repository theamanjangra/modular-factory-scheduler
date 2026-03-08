
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching all ModuleProfiles...");
    const profiles = await prisma.moduleProfile.findMany();
    console.log(`Found ${profiles.length} profiles:`);
    console.table(profiles.slice(0, 20).map(p => ({
        id: p.id,
        name: p.name
    })));
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
