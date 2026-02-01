
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

    console.log("\n--- MODULE PROFILES ---");
    const profiles = await listModuleProfiles(dc);
    console.log(JSON.stringify(profiles.data.moduleProfiles, null, 2));

    console.log("\n----------------DONE");
    process.exit(0);
}

main().catch(console.error);
