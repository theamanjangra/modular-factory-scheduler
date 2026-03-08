
import { SchedulingAdapterService } from '../src/services/schedulingAdapterService';

async function main() {
    console.log("Testing Adapter for Department IDs...");
    const service = new SchedulingAdapterService();

    // Run the mock simulation
    const result: any = await service.simulate(); // Cast to any to access potentially missing types in strict mode

    console.log(`Received ${result.tasks?.length} tasks.`);

    if (!result.tasks || result.tasks.length === 0) {
        console.error("No tasks returned!");
        process.exit(1);
    }

    const tasksWithDept = result.tasks.filter(t => t.departmentId);
    console.log(`Tasks with departmentId: ${tasksWithDept.length}/${result.tasks.length}`);

    if (tasksWithDept.length === result.tasks.length) {
        console.log("SUCCESS: All tasks have departmentId.");

        // Log a sample
        console.log("Sample Task:", JSON.stringify(tasksWithDept[0], null, 2));
    } else {
        console.error("FAILURE: Some tasks are missing departmentId.");
        tasksWithDept.forEach(t => console.log(`- ${t.name}: ${t.departmentId}`));
        process.exit(1);
    }
}

main().catch(console.error);
