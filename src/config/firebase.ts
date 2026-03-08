
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Load env vars if not already loaded
dotenv.config();

// Path to service account key (Mainly for local dev if not using ADC)
// We try to find the one used in scripts, or fallback to a standard name
const possibleKeys = [
    'vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json',
    'serviceAccountKey.json'
];

let serviceAccount: any = null;

// internal helper to find key
const findKey = () => {
    for (const file of possibleKeys) {
        // Check root and parent (in case running from src/ or build/)
        const p1 = path.resolve(process.cwd(), file);
        const p2 = path.resolve(process.cwd(), '..', file);

        if (fs.existsSync(p1)) return p1;
        if (fs.existsSync(p2)) return p2;
    }
    return null;
}

if (!admin.apps.length) {
    try {
        const keyPath = findKey();

        if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            // 1. Prefer Env Vars (Production / Cloud Run)
            console.log('🔥 Initializing Firebase from Environment Variables');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // Handle escaped newlines in env vars
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            });
        } else if (keyPath) {
            // 2. Fallback to Local JSON Key
            console.log(`🔥 Initializing Firebase from Key File: ${path.basename(keyPath)}`);
            admin.initializeApp({
                credential: admin.credential.cert(require(keyPath))
            });
        } else {
            // 3. Fallback to ADC (Application Default Credentials) 
            // This works on Cloud Run if the Service Account has permissions
            console.log('🔥 Initializing Firebase with Application Default Credentials');
            admin.initializeApp();
        }
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
    }
}

export const db = admin.firestore();
export const auth = admin.auth();
