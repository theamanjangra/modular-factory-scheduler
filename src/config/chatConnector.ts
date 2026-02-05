/**
 * Chat Connector Configuration
 * Configures the Firebase Data Connect client for chat operations
 * Connects to emulator in development, production in prod
 */

import { initializeApp, getApps } from 'firebase/app';
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '../dataconnect-generated';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase client app (only once)
try {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_PROJECT_ID) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        apiKey: process.env.FIREBASE_WEB_API_KEY || 'dummy-key-for-emulator',
      });
    }
  }
} catch (e) {
  console.warn("[ChatConnector] Init warning:", e);
}

// Get Data Connect instance for chat connector
let chatDataConnectInstance: any;
try {
  // Only attempt if projectId exists to avoid instant crash
  if (process.env.FIREBASE_PROJECT_ID) {
    chatDataConnectInstance = getDataConnect(connectorConfig);
  } else {
    throw new Error("Missing Project ID");
  }

  // Connect to emulator if running locally
  const useEmulator = process.env.USE_DATACONNECT_EMULATOR !== 'false';

  if (useEmulator) {
    console.log('🔧 [Chat] Connecting to Data Connect Emulator at localhost:9399');
    connectDataConnectEmulator(chatDataConnectInstance, 'localhost', 9399);
  } else {
    console.log('🌐 [Chat] Connecting to Production Data Connect');
  }

} catch (e) {
  console.warn("[ChatConnector] Failed to init DataConnect (Mocking):", e);
  chatDataConnectInstance = {
    executeMutation: async () => { throw new Error("Mock Chat: Not Configured"); },
    executeQuery: async () => { throw new Error("Mock Chat: Not Configured"); }
  } as any;
}

export { chatDataConnectInstance as chatDataConnect };
