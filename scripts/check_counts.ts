import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const modules = await prisma.module.count();
    const travelers = await prisma.traveler.count();
    const tasks = await prisma.task.count();
    const workers = await prisma.worker.count();

    console.log(`--- Current Counts ---`);
    console.log(`Workers: ${workers}`);
    console.log(`Modules: ${modules}`);
    console.log(`Travelers: ${travelers}`);
    console.log(`Tasks: ${tasks}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
