
import * as admin from 'firebase-admin';
import * as path from 'path';

// Load the service account (user provided path)
const serviceAccount = require(path.join(__dirname, '../vederra-dev-d4327-firebase-adminsdk-fbsvc-7346e6ca28.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCollections() {
    console.log("Checking Firestore for 'workers' collection...");
    try {
        const snapshot = await db.collection('workers').limit(1).get();
        if (snapshot.empty) {
            console.log("Collection 'workers' is empty or does not exist.");
        } else {
            console.log("Found 'workers' collection! Sample doc ID:", snapshot.docs[0].id);
            console.log("Sample doc data:", snapshot.docs[0].data());
        }
    } catch (error) {
        console.error("Error accessing Firestore:", error);
    }
}

checkCollections();
