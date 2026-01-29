import { initializeApp, cert } from "firebase-admin/app";
import { getDataConnect } from "firebase-admin/data-connect";
import * as dotenv from "dotenv";
import serviceAccount from "../vederra-7c271-firebase-adminsdk-fbsvc-759bcea130.json"; // 👈 adjust path if needed

dotenv.config();

interface GraphQLResult {
  data?: Record<string, unknown>;
  errors?: { message: string }[];
}

(async () => {
  try {
    console.log("🔍 Testing Firebase Data Connect...");

    // ✅ Initialize Firebase Admin with service account
    initializeApp({
      credential: cert(serviceAccount as any),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "vederra-7c271",
    });

    // ✅ Connect to Data Connect
    const dataConnect = getDataConnect({
      serviceId: "vos-web-1",      // 👈 must match your Data Connect service name
      location: "us-central1",   // 👈 must match your region
    });

    // ✅ Simple GraphQL query to confirm connection
    const query = `
  query {
    __schema {
      queryType {
        name
      }
    }
  }
`;

    const result: GraphQLResult = await dataConnect.executeGraphql(query);

    if (result.errors?.length) {
      console.error("❌ GraphQL errors:", result.errors);
    } else {
      console.log("✅ Connection successful. Result:");
      console.log(result.data);
    }
  } catch (error) {
    console.error("❌ DataConnect test failed:", error);
  }
})();