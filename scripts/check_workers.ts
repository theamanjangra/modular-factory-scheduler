
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.worker.count();
        console.log(`Worker count: ${count}`);

        if (count > 0) {
            const firstWorker = await prisma.worker.findFirst({
                include: {
                    workerDepartments: {
                        include: { department: true }
                    }
                }
            });
            console.log('First worker:', JSON.stringify(firstWorker, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
