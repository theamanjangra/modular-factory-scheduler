
import { initializeApp } from "firebase/app";
import { getDataConnect, connectDataConnectEmulator } from "firebase/data-connect";
import { connectorConfig } from "./dataconnect-generated";

const firebaseConfig = {
    // Production Config (User needs to populate these or use proper ENV vars)
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: "vederra-scheduler.firebaseapp.com",
    projectId: "vederra-scheduler",
    storageBucket: "vederra-scheduler.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const dc = getDataConnect(app, connectorConfig);

// If running in development (and not explicitly targeting production via env), use emulator?
// For now, let's allow an override.
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
    console.log("Using Data Connect Emulator...");
    connectDataConnectEmulator(dc, '127.0.0.1', 9399);
}
