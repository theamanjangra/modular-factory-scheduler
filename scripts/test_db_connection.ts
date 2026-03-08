import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing database connection...');
    try {
        await prisma.$connect();
        console.log('Successfully connected to the database!');

        // meaningful query to ensure it's not just a phantom connection
        const userCount = await prisma.user.count();
        console.log(`Connection verified. Found ${userCount} users in the database.`);
    } catch (error) {
        console.error('Failed to connect to the database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
