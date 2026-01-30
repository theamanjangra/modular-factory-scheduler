import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking database connection and schema...');

    try {
        // Check for Vederra-specific tables
        const shifts = await prisma.shift.count();
        const depts = await prisma.department.count();
        const workers = await prisma.worker.count();
        const profiles = await prisma.moduleProfile.count();
        const templates = await prisma.travelerTemplate.count();

        console.log('\n✅ Database connection successful!');
        console.log('📊 Current Data Counts:');
        console.log(`   - Shifts: ${shifts}`);
        console.log(`   - Departments: ${depts}`);
        console.log(`   - Workers: ${workers}`);
        console.log(`   - Module Profiles: ${profiles}`);
        console.log(`   - Traveler Templates: ${templates}`);

        if (shifts === 0 && workers === 0) {
            console.log('\nℹ️  Database appears to be empty (Schema deployed, no data).');
            console.log('   Ready for Phase 2: Data Import.');
        } else {
            console.log('\nℹ️  Database already contains data.');
        }

    } catch (error) {
        console.error('\n❌ Error connecting to database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
