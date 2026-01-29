
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local explicitly to ensure we hit the dev DB
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const prisma = new PrismaClient();

const DUMMY_PLAN_ID = 'plan_dummy_1';
const START_DATE = "2024-05-20T07:00:00Z";
const END_DATE = "2024-05-20T17:00:00Z";

async function main() {
    console.log(`Doing seed for ${process.env.DATABASE_URL?.split('@')[1]}`);
    console.log(`Seeding Plan: ${DUMMY_PLAN_ID}...`);

    // 1. Clean previous run
    try {
        await prisma.workerTaskAssignment.deleteMany({ where: { planId: DUMMY_PLAN_ID } });
        await prisma.plan.delete({ where: { id: DUMMY_PLAN_ID } });
        console.log("Cleaned old data.");
    } catch (e) {
        // Ignore not found
    }

    // 2. Define Input Snapshot (Tasks & Workers)
    const tasks = [
        { taskId: "task_1", name: "Job 1", estimatedTotalLaborHours: 10, estimatedRemainingLaborHours: 10 },
        { taskId: "task_2", name: "Job 2", estimatedTotalLaborHours: 5, estimatedRemainingLaborHours: 5 },
        { taskId: "task_3", name: "Job 3", estimatedTotalLaborHours: 8, estimatedRemainingLaborHours: 8 }
    ];

    const workers = [
        { workerId: "w1", name: "Alice" },
        { workerId: "w2", name: "Bob" }
    ];

    // 3. Create Plan with Snapshot and Initial Assignments
    await prisma.plan.create({
        data: {
            id: DUMMY_PLAN_ID,
            name: "Dummy Dev Plan",
            createdAt: new Date(),
            updatedAt: new Date(),
            inputSnapshot: {
                tasks,
                workers,
                interval: { startTime: START_DATE, endTime: END_DATE }
            },
            assignments: {
                create: [
                    {
                        workerId: "w1",
                        taskId: "task_1",
                        shiftId: "shift_1",
                        startTime: new Date("2024-05-20T07:00:00Z"),
                        endTime: new Date("2024-05-20T12:00:00Z")
                    },
                    {
                        workerId: "w2",
                        taskId: "task_2",
                        shiftId: "shift_1",
                        startTime: new Date("2024-05-20T07:00:00Z"),
                        endTime: new Date("2024-05-20T12:00:00Z")
                    }
                ]
            }
        }
    });

    console.log(`✅ Plan ${DUMMY_PLAN_ID} seeded successfully.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
