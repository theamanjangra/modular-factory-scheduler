
import * as admin from 'firebase-admin';
import * as path from 'path';

// Load the service account (user provided path)
const serviceAccount = require(path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTaskTemplates() {
    console.log("Checking Firestore - TaskTemplates Details...");
    try {
        const snap = await db.collection('taskTemplates').limit(3).get();
        if (snap.empty) {
            console.log("Empty taskTemplates.");
        } else {
            snap.docs.forEach(doc => {
                console.log(`\n--- Template ID: ${doc.id} ---`);
                console.log(JSON.stringify(doc.data(), null, 2));
            });
        }
    } catch (error) {
        console.error("Error accessing Firestore:", error);
    }
}

checkTaskTemplates();
