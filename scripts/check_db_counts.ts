
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const workers = await prisma.worker.count();
        const travelerTemplates = await prisma.travelerTemplate.count();
        const activeTravelers = await prisma.traveler.count();
        const tasks = await prisma.task.count();
        const pastPlans = await prisma.productionPlan.count();

        console.log("=== Database Counts ===");
        console.log(`Workers: ${workers}`);
        console.log(`Traveler Templates: ${travelerTemplates}`);
        console.log(`Active Travelers (Instances): ${activeTravelers}`);
        console.log(`Tasks (Instances): ${tasks}`);
        console.log(`Generated Plans: ${pastPlans}`);
        console.log("=======================");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
