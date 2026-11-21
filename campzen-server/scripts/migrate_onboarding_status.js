/**
 * Migration Script: Migrate Existing User Accounts for First-Time Tutorial
 * Sets onboardingStatus = 'COMPLETED' for all existing student and vendor accounts
 * so that existing users NEVER see the onboarding tutorial automatically.
 * Only genuine new accounts registered after the rollout start with 'NOT_STARTED'.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/user.model');

async function runOnboardingMigration() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kami_test_db';
    console.log(`[Migration] Connecting to database: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
    await mongoose.connect(mongoUri);

    try {
        const rolloutTimestamp = new Date();
        console.log(`[Migration] Feature Rollout Timestamp: ${rolloutTimestamp.toISOString()}`);

        // Find all accounts missing onboardingStatus or with null/undefined status
        const query = {
            $or: [
                { onboardingStatus: { $exists: false } },
                { onboardingStatus: null },
                { onboardingStatus: 'NOT_STARTED' }
            ],
            createdAt: { $lte: rolloutTimestamp }
        };

        const totalExisting = await User.countDocuments(query);
        console.log(`[Migration] Found ${totalExisting} existing account(s) eligible for legacy onboarding completion.`);

        const result = await User.updateMany(query, {
            $set: {
                onboardingStatus: 'COMPLETED',
                onboardingVersion: 1,
                onboardingCompletedAt: new Date()
            }
        });

        console.log(`[Migration] Successfully updated ${result.modifiedCount} account(s) to 'COMPLETED'.`);
        console.log('[Migration] Migration finished successfully.');
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    runOnboardingMigration()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('[Migration Error]:', err);
            process.exit(1);
        });
}

module.exports = { runOnboardingMigration };
