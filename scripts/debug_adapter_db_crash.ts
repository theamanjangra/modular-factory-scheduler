
import { SchedulingAdapterService } from '../src/services/schedulingAdapterService';

async function main() {
    console.log("Testing Adapter DB Simulation...");
    const service = new SchedulingAdapterService();

    try {
        console.log("Calling simulateFromDB()...");
        const result: any = await service.simulateFromDB();
        console.log("SUCCESS: simulateFromDB returned.");
        console.log(`Tasks: ${result.tasks?.length}, Workers: ${result.workers?.length}`);

        if (result.tasks && result.tasks.length > 0) {
            const sample = result.tasks[0];
            console.log("Sample Task:", JSON.stringify(sample, null, 2));
            if (!sample.departmentId) {
                console.error("FAILURE: Sample task missing departmentId");
                process.exit(1);
            }
        }
    } catch (e) {
        console.error("FAILURE: simulateFromDB crashed with error:");
        console.error(e);
        process.exit(1);
    }
}

main().catch(console.error);
