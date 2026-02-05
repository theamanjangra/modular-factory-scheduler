
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Testing Simulation DB Logic...");

    // 1. Check Travelers
    const activeTravelers = await prisma.traveler.findMany({
        where: { isShipped: false }
    });
    console.log(`Step 1: Found ${activeTravelers.length} active travelers (isShipped=false).`);

    // 2. Check Tasks with string 'pending'
    const pendingTasks = await prisma.task.findMany({
        where: { leadStatus: 'pending' }
    });
    console.log(`Step 2: Found ${pendingTasks.length} pending tasks (leadStatus='pending').`);

    // 3. Check Tasks with Enum (if applicable, though prisma client handles string mapping usually)
    // We'll rely on Step 2 output vs Step 1 to see where data drops.

    // 4. Run the full query from Adapter
    const fullQuery = await prisma.traveler.findMany({
        where: { isShipped: false },
        include: {
            tasks: {
                where: { leadStatus: 'pending' },
                include: { taskTemplate: { include: { department: true } } }
            },
            moduleProfile: true
        }
    });

    let totalTasks = 0;
    for (const t of fullQuery) {
        totalTasks += t.tasks.length;
    }
    console.log(`Step 4: Full Adapter Query found ${fullQuery.length} travelers with ${totalTasks} total tasks.`);

    if (totalTasks === 0) {
        console.warn("⚠️ This matches the fallback behavior (Zero tasks found).");
    } else {
        console.log("✅ Data exists! The issue might be environmental (active backend connecting to wrong DB?)");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
