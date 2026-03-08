
import { PrismaClient } from '@prisma/client';
import { SchedulingAdapterService } from '../src/services/schedulingAdapterService';

async function main() {
    console.log("Debugging Department IDs...");
    const prisma = new PrismaClient();
    const service = new SchedulingAdapterService();

    try {
        // 1. Fetch All Departments
        const depts = await prisma.department.findMany();
        console.log("\n--- DB DEPARTMENTS ---");
        depts.forEach(d => console.log(`${d.name}: ${d.id}`));
        const validDeptIds = new Set(depts.map(d => d.id));

        // 2. Run Simulation
        console.log("\n--- RUNNING SIMULATION ---");
        const result: any = await service.simulateFromDB();

        if (!result.tasks || result.tasks.length === 0) {
            console.error("No tasks returned from simulation.");
            process.exit(1);
        }

        // 3. Analyze Tasks
        console.log(`\nReceived ${result.tasks.length} tasks.`);
        const taskDeptIds = new Set<string>();
        const missingDepts = new Set<string>();

        result.tasks.forEach((t: any) => {
            if (t.departmentId) {
                taskDeptIds.add(t.departmentId);
                if (!validDeptIds.has(t.departmentId)) {
                    missingDepts.add(t.departmentId);
                }
            } else {
                console.warn(`Task ${t.name} has NO departmentId`);
            }
        });

        console.log("\n--- TASK DEPARTMENT IDS ---");
        taskDeptIds.forEach(id => {
            const d = depts.find(dept => dept.id === id);
            console.log(`${id} (${d ? d.name : 'UNKNOWN'})`);
        });

        if (missingDepts.size > 0) {
            console.error("\nWARNING: Some tasks have Department IDs not found in DB:");
            missingDepts.forEach(id => console.log(id));
        } else {
            console.log("\nSUCCESS: All task department IDs are valid.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
