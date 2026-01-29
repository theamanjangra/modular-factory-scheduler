import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

async function getTestIdToken() {
    try {
        const uid = 'test-user-' + Date.now();

        // Step 1: Create custom token
        console.log('🔧 Creating custom token...');
        const customToken = await getAuth().createCustomToken(uid, {
            email: 'test@example.com',
            role: 'tester',
        });

        console.log('✅ Custom token created');

        // Step 2: Exchange for ID token via REST API
        console.log('🔄 Exchanging for ID token...');

        // Note: We need the Firebase Web API key for this
        // The user should add FIREBASE_WEB_API_KEY to their .env
        const apiKey = process.env.FIREBASE_WEB_API_KEY;

        if (!apiKey) {
            console.log('\n⚠️  WARNING: FIREBASE_WEB_API_KEY not found in .env');
            console.log('To get your Web API Key:');
            console.log('1. Go to Firebase Console → Project Settings → General');
            console.log('2. Scroll down to "Your apps" → Web apps');
            console.log('3. Copy the "Web API Key"');
            console.log('4. Add to .env: FIREBASE_WEB_API_KEY=your-key-here\n');
            console.log('For now, using the custom token (may not work with verifyIdToken):\n');
            console.log('Custom Token:');
            console.log('----------------------------------------');
            console.log(customToken);
            console.log('----------------------------------------\n');
            return;
        }

        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: customToken,
                    returnSecureToken: true,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to exchange token: ${error}`);
        }

        const data = await response.json();
        const idToken = data.idToken;

        console.log('\n✅ ID Token Generated Successfully!');
        console.log('========================================');
        console.log(idToken);
        console.log('========================================\n');

        console.log('📋 Use this token in Postman:');
        console.log('Header: Authorization');
        console.log('Value: Bearer ' + idToken);
        console.log('\n⏰ Token expires in 1 hour\n');

    } catch (error) {
        console.error('❌ Error generating token:', error);
    }
}

getTestIdToken();
