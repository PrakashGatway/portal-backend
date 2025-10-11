import cron from 'node-cron';
import { createMissingWallets, validateAllWallets } from './missingWallets.js';

const setupWalletCronJob = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running nightly wallet creation job at 12 AM...');
        console.log('📅', new Date().toISOString());
        try {
            const result = await createMissingWallets();
            if (result.success) {
                console.log(`✅ Nightly wallet creation completed: ${result.message}`);
                if (result.created > 0) {
                    console.log(`📈 Created ${result.created} new wallets`);
                }
            } else {
                console.error(`❌ Nightly wallet creation failed: ${result.message}`);
            }
        } catch (error) {
            console.error('❌ Error in nightly wallet creation:', error);
        }
    });
};

const runManualCheck = async () => {
    console.log('🔄 Running manual wallet check...');
    try {
        const result = await createMissingWallets();
        console.log('Manual check result:', result);
        return result;
    } catch (error) {
        console.error('Manual check failed:', error);
        throw error;
    }
};

export { setupWalletCronJob, runManualCheck };