
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking ProductionPlanShift data...");

    const count = await prisma.productionPlanShift.count();
    console.log(`Total Records: ${count}`);

    if (count > 0) {
        const records = await prisma.productionPlanShift.findMany({
            take: 5,
            include: { shift: true }
        });
        console.log("Sample Records:", JSON.stringify(records, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
