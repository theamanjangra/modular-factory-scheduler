
import { initializeApp } from "firebase/app";
import { getDataConnect, connectDataConnectEmulator } from "firebase/data-connect";
import {
    upsertShift,
    upsertDepartment,
    upsertModuleProfile,
    upsertTravelerTemplate,
    connectorConfig
} from "../client/src/dataconnect-generated";

const firebaseConfig = {
    projectId: "vederra-scheduler",
    // No API key needed for public mutations in this context, 
    // or it will rely on default credentials if signed in via gcloud.
};

const app = initializeApp(firebaseConfig);
const dc = getDataConnect(app, connectorConfig);

// Uncomment the line below to test against local emulator instead of production
// connectDataConnectEmulator(dc, '127.0.0.1', 9399);

async function main() {
    console.log("🌱 Seeding Production Data...");

    console.log("   - Upserting Shifts...");
    await upsertShift(dc, { id: "shift-1", name: "Shift 1 (Day)", startTime: "2023-01-01T06:00:00Z", endTime: "2023-01-01T14:30:00Z" });
    await upsertShift(dc, { id: "shift-2", name: "Shift 2 (Swing)", startTime: "2023-01-01T14:30:00Z", endTime: "2023-01-01T23:00:00Z" });

    console.log("   - Upserting Departments...");
    await upsertDepartment(dc, { id: "dept-assembly", name: "Assembly" });
    await upsertDepartment(dc, { id: "dept-logistics", name: "Logistics" });
    await upsertDepartment(dc, { id: "dept-welding", name: "Welding" });

    console.log("   - Upserting Module Profiles...");
    await upsertModuleProfile(dc, { id: "mp-standard", name: "Standard Unit" });
    await upsertModuleProfile(dc, { id: "mp-custom", name: "Custom Build" });

    console.log("   - Upserting Traveler Templates...");
    await upsertTravelerTemplate(dc, { id: "tt-standard", name: "Standard Traveler" });

    console.log("✅ Seeding Complete!");
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Seeding Failed:", err);
    process.exit(1);
});
