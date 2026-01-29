"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env first
dotenv_1.default.config();
// Force temperature to 1 to avoid "unsupported value" error
process.env.LLM_TEMPERATURE = '1';
// Bypass auth for this script
process.env.BYPASS_AUTH = 'true';
// Set dummy values for required vars if missing
const requiredVars = [
    'PORT', 'CORS_ORIGIN', 'DATABASE_URL', 'FIREBASE_PROJECT_ID', 'ORIGINS',
    'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_REGION',
    'DATA_CONNECT_CONNECTION_ID', 'FIREBASE_PRIVATE_KEY_ID', 'FIREBASE_CLIENT_ID',
    'FIREBASE_AUTH_URI', 'FIREBASE_TOKEN_URI', 'FIREBASE_AUTH_PROVIDER_CERT_URL',
    'FIREBASE_CLIENT_CERT_URL'
];
requiredVars.forEach(key => {
    if (!process.env[key]) {
        process.env[key] = 'dummy_value_for_verification';
    }
});
// Fix for DATA_CONNECT_LOCATION which is mapped to FIREBASE_REGION in envConfig
if (!process.env.DATA_CONNECT_LOCATION) {
    process.env.DATA_CONNECT_LOCATION = process.env.FIREBASE_REGION || 'us-central1';
}
const app_1 = require("../src/app");
const PORT = 3005;
const server = app_1.app.listen(PORT, async () => {
    console.log(`🚀 Verification Server running on port ${PORT}`);
    try {
        const response = await fetch(`http://localhost:${PORT}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Hello from verification script! My name is Bob. Give me one line about the documents shared with you." })
        });
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
        if (data.success) {
            console.log('✅ Verification Passed!');
            process.exit(0);
        }
        else {
            console.error('❌ Verification Failed:', data);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
    finally {
        server.close();
    }
});
