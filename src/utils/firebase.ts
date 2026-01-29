import * as admin from "firebase-admin";
import { ENV } from "../config/envConfig";

// Initialize Firebase Admin SDK with environment variables
let authInstance: admin.auth.Auth;
let firestoreInstance: admin.firestore.Firestore;

try {
  if (!admin.apps.length) {
    if (ENV.FIREBASE.project_id && ENV.FIREBASE.private_key) {
      admin.initializeApp({
        credential: admin.credential.cert(ENV.FIREBASE as admin.ServiceAccount),
        projectId: ENV.FIREBASE.project_id
      });
      console.log("✅ Firebase Admin initialized successfully");
    } else {
      console.warn("⚠️ Firebase credentials missing. Skipping initialization (Mock Mode).");
    }
  }

  // Try to get instances (will throw if no app initialized)
  if (admin.apps.length) {
    authInstance = admin.auth();
    firestoreInstance = admin.firestore();
  } else {
    throw new Error("No Firebase App");
  }

} catch (error) {
  console.warn(`[Firebase] Initialization failed/skipped: ${error}. Using partial mocks.`);

  // Mock Auth
  authInstance = {
    verifyIdToken: async () => { throw new Error("Firebase Auth is not initialized (Mock Mode)"); },
    getUser: async () => { throw new Error("Firebase Auth is not initialized (Mock Mode)"); }
  } as unknown as admin.auth.Auth;

  // Mock Firestore
  firestoreInstance = {
    collection: () => ({
      doc: () => ({ set: async () => { }, get: async () => ({ exists: false }) })
    })
  } as unknown as admin.firestore.Firestore;
}

export const auth = authInstance;
export const firestore = firestoreInstance;
export const authAdmin = authInstance;

export const verifyIdToken = async (idToken: string) => {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid token');
  }
};


export const getUserByUid = async (uid: string) => {
  try {
    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error) {
    throw new Error('User not found');
  }
};
