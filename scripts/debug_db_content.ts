
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

async function main() {
    console.log(`🔌 Connecting to: ${process.env.DATABASE_URL?.split('@')[1]} ...`); // Log host only for privacy

    try {
        await prisma.$connect();
        console.log("✅ Custom Connection Successful!");

        // List tables using raw SQL (Postgres specific)
        const tables: any[] = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `;

        console.log("\n📊 Tables found in DB:");
        if (tables.length === 0) {
            console.log("   (No tables found)");
        } else {
            for (const t of tables) {
                // Count rows for key tables
                let count = 0;
                try {
                    const countRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${t.table_name}"`);
                    count = Number(countRes[0].c);
                } catch (e) { count = -1; }

                console.log(`   - ${t.table_name} (${count} rows)`);
            }
        }

    } catch (err: any) {
        console.error("❌ Connection Failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
