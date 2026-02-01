
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
    await upsertShift(dc, { id: "11111111-1111-4111-8111-111111111111", name: "Shift 1 (Day)", startTime: "2023-01-01T06:00:00Z", endTime: "2023-01-01T14:30:00Z" });
    await upsertShift(dc, { id: "22222222-2222-4222-8222-222222222222", name: "Shift 2 (Swing)", startTime: "2023-01-01T14:30:00Z", endTime: "2023-01-01T23:00:00Z" });

    console.log("   - Upserting Departments...");
    await upsertDepartment(dc, { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Assembly" });
    await upsertDepartment(dc, { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Logistics" });
    await upsertDepartment(dc, { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Welding" });

    console.log("   - Upserting Module Profiles...");
    await upsertModuleProfile(dc, { id: "33333333-3333-4333-8333-333333333333", name: "Standard Unit" });
    await upsertModuleProfile(dc, { id: "44444444-4444-4444-8444-444444444444", name: "Custom Build" });

    console.log("   - Upserting Traveler Templates...");
    await upsertTravelerTemplate(dc, { id: "55555555-5555-4555-8555-555555555555", name: "Standard Traveler" });

    console.log("✅ Seeding Complete!");
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Seeding Failed:", err);
    process.exit(1);
});
