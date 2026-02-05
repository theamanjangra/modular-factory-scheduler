
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Listing All Departments...");
    const depts = await prisma.department.findMany({
        select: { name: true }
    });

    depts.forEach(d => console.log(` - ${d.name}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
