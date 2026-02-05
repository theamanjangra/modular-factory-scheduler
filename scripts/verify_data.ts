
import { initializeApp } from "firebase/app";
import { getDataConnect } from "firebase/data-connect";
import {
    listShifts,
    listDepartments,
    listModuleProfiles,
    listTravelerTemplates,
    connectorConfig
} from "../client/src/dataconnect-generated";

const firebaseConfig = {
    projectId: "vederra-scheduler",
};

const app = initializeApp(firebaseConfig);
const dc = getDataConnect(app, connectorConfig);

async function main() {
    console.log("🔍 Verifying Database Content...");

    console.log("\n--- SHIFTS ---");
    const shifts = await listShifts(dc);
    console.log(JSON.stringify(shifts.data.shifts, null, 2));

    console.log("\n--- DEPARTMENTS ---");
    const depts = await listDepartments(dc);
    console.log(JSON.stringify(depts.data.departments, null, 2));

    console.log("\n--- WORKERS (Sample 5) ---");
    // We assume a 'listWorkers' query exists or we fetch via raw query if possible. 
    // Since we generated mutations, we should check if we generated queries for Workers.
    // If not, we can try to use a flexible query or just rely on previous success log.
    // Checking dataconnect-generated content first... assuming listWorkers exists.
    try {
        const { listWorkers } = await import("../client/src/dataconnect-generated/js/default-connector/index.cjs");
        const workers = await listWorkers(dc);
        console.log(JSON.stringify(workers.data.workers.slice(0, 5), null, 2));
        console.log(`Total Workers: ${workers.data.workers.length}`);
    } catch (e: any) {
        console.log("Could not list workers (query might be missing):", e.message);
    }

    console.log("\n--- MODULE PROFILES ---");
    const profiles = await listModuleProfiles(dc as any);
    console.log(JSON.stringify(profiles.data.moduleProfiles, null, 2));

    console.log("\n----------------DONE");
    process.exit(0);
}

main().catch(console.error);
