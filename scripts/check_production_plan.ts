
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking ProductionPlan data...");

    // Fetch production plans
    const plans = await prisma.productionPlan.findMany();
    console.log(`Total Production Plans: ${plans.length}`);

    if (plans.length > 0) {
        console.log("Sample Production Plan:", JSON.stringify(plans[0], null, 2));
    } else {
        console.log("No Production Plans found.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
