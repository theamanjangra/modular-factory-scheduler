
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testConnection() {
    const connectionString = process.env.DATABASE_URL;
    console.log("Loaded DATABASE_URL:", connectionString?.replace(/:([^:@]+)@/, ':***@'));

    // Extract password to see if it was corrupted
    const match = connectionString?.match(/:([^:@]+)@/);
    if (match) {
        const pass = match[1];
        console.log(`Password length: ${pass.length}`);
        console.log(`Password ends with $: ${pass.endsWith('$')}`);
        console.log(`Password ends with %24: ${pass.endsWith('%24')}`);
        // Print last 3 chars for debugging (safe enough given we know what it should be)
        if (pass.length > 3) {
            console.log(`Password tail: ...${pass.substring(pass.length - 3)}`);
        }
    }

    console.log("\nAttempting direct connection with pg...");

    // Parse the known details manually to avoid string parsing issues
    const client = new Client({
        user: 'postgres',
        host: '104.197.55.77',
        database: 'postgres',
        password: '22166207Abc', // Explicitly hardcoded valid password
        port: 5432,
        ssl: false // or { rejectUnauthorized: false } depending on server
    });

    try {
        await client.connect();
        console.log("✅ Success! Connected successfully with explicit parameters.");
        const res = await client.query('SELECT NOW()');
        console.log('Server Time:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error("❌ Connection failed with explicit parameters:", err);
    }
}

testConnection();
