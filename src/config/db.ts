import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local if it exists (for dev overrides)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    console.log('Loading environment from .env.local');
    dotenv.config({ path: envLocalPath, override: true });
} else {
    dotenv.config(); // Standard load
}


// Create a single instance of PrismaClient
// import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient;

function getPrisma() {
    if (!prismaInstance) {
        try {
            prismaInstance = new PrismaClient({
                log: ['query', 'info', 'warn', 'error'],
            });
        } catch (e) {
            console.warn("Failed to init Prisma Client (DB might be disabled):", e);
            // Return a mock or re-throw depending on severity.
            // For now, let it throw when accessed if init fails.
            throw e;
        }
    }
    return prismaInstance;
}

// Proxy to allow 'prisma.user.findMany' syntax to work via lazy init
export const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop) => {
        return (getPrisma() as any)[prop];
    }
});

export async function connectDB() {
    try {
        await getPrisma().$connect();
        console.log("✅ PostgreSQL connected successfully with Prisma!");
    } catch (err) {
        console.error("❌ Error connecting to PostgreSQL:", err);
        // process.exit(1); // Don't exit, just log
    }
}

export async function disconnectDB() {
    try {
        await getPrisma().$disconnect();
        console.log("✅ PostgreSQL disconnected successfully!");
    } catch (err) {
        console.error("❌ Error disconnecting from PostgreSQL:", err);
    }
}
