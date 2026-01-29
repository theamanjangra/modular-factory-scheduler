import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDataConnect } from "firebase-admin/data-connect";
// import serviceAccount from "../../vederra-7c271-firebase-adminsdk-fbsvc-759bcea130.json";

// Initialize Firebase Admin SDK if not already initialized
try {
  if (!getApps().length) {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }
  }
} catch (e) {
  console.warn("[DataConnect] Init warning:", e);
}

let dataConnectInstance;
try {
  if (process.env.DATA_CONNECT_SERVICE_ID && process.env.DATA_CONNECT_LOCATION) {
    dataConnectInstance = getDataConnect({
      serviceId: process.env.DATA_CONNECT_SERVICE_ID,
      location: process.env.DATA_CONNECT_LOCATION,
    });
  } else {
    throw new Error("Missing DataConnect Env Vars");
  }
} catch (e) {
  console.warn("[DataConnect] Client init failed (Mocking):", e);
  // Mock DataConnect Interface
  dataConnectInstance = {
    executeGraphql: async () => { throw new Error("DataConnect Mock: Not Configured"); }
  } as any;
}

export const dataConnect = dataConnectInstance;
