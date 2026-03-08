
import { SynchronizationService } from '../src/services/synchronizationService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load envs
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

async function main() {
    console.log('🧪 Testing Synchronization Service...');

    const service = new SynchronizationService();

    // 1. Test Worker Sync
    console.log('\n--- Syncing Workers ---');
    try {
        const r1 = await service.syncWorkers();
        console.log('Result:', r1);
    } catch (e: any) {
        console.error('Error syncing workers:', e.message);
    }

    // 2. Test Labor Data Sync
    console.log('\n--- Syncing Labor Data ---');
    try {
        const r2 = await service.syncLaborData();
        console.log('Result:', r2);
    } catch (e: any) {
        console.error('Error syncing labor data:', e.message);
    }

    console.log('\n✅ Test Complete');
    process.exit(0);
}

main();
