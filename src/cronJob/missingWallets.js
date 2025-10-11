import mongoose from 'mongoose';
import User from '../models/User.js';
import { Wallet } from '../models/Wallet.js';


const generateReferralCodeFromUserId = (userId) => {
    const baseString = userId.toString();
    let hash = 0;
    for (let i = 0; i < baseString.length; i++) {
        const char = baseString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `GATE${Math.abs(hash).toString(36).toUpperCase().substring(0, 8)}`;
};

const createMissingWallets = async () => {
    const session = await mongoose.startSession();

    try {
        console.log('🔍 Starting wallet creation process for users without wallets...');

        await session.startTransaction();

        const usersWithoutWallets = await User.aggregate([
            {
                $lookup: {
                    from: 'wallets',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'wallets'
                }
            },
            {
                $match: {
                    'wallets': { $size: 0 }
                }
            },
            {
                $project: {
                    _id: 1,
                    email: 1,
                    createdAt: 1
                }
            }
        ]).session(session);

        console.log(`📊 Found ${usersWithoutWallets.length} users without wallets`);

        if (usersWithoutWallets.length === 0) {
            console.log('✅ All users have wallets. No action needed.');
            await session.commitTransaction();
            session.endSession();
            return {
                success: true,
                message: 'All users have wallets',
                created: 0
            };
        }

        // Create wallets for users without them
        const walletCreationPromises = usersWithoutWallets.map(async (user) => {
            try {
                const wallet = await Wallet.create([{
                    user: user._id,
                    balance: 0,
                    totalEarned: 0,
                    referralEarnings: 0,
                    totalReferrals: 0,
                    referralCode: generateReferralCodeFromUserId(user._id),
                    referredBy: null
                }], { session });

                console.log(`✅ Created wallet for user: ${user.email} (${user._id})`);
                return wallet[0];
            } catch (error) {
                console.error(`❌ Failed to create wallet for user ${user.email}:`, error.message);
                return null;
            }
        });

        const createdWallets = (await Promise.all(walletCreationPromises)).filter(wallet => wallet !== null);

        await session.commitTransaction();

        console.log(`🎉 Successfully created ${createdWallets.length} wallets`);

        return {
            success: true,
            message: `Successfully created ${createdWallets.length} wallets`,
            created: createdWallets.length,
            failed: usersWithoutWallets.length - createdWallets.length,
            details: {
                totalUsersChecked: usersWithoutWallets.length,
                walletsCreated: createdWallets.length,
                failures: usersWithoutWallets.length - createdWallets.length
            }
        };

    } catch (error) {
        console.error('❌ Error in createMissingWallets:', error);
        await session.abortTransaction();

        return {
            success: false,
            message: 'Failed to create missing wallets',
            error: error.message,
            created: 0
        };
    } finally {
        session.endSession();
    }
};

// Function to validate existing wallets (optional)
const validateAllWallets = async () => {
    try {
        console.log('🔍 Validating all wallets...');

        const allUsers = await User.find({});
        const allWallets = await Wallet.find({});

        const usersWithWallets = new Set(allWallets.map(wallet => wallet.user.toString()));
        const usersWithoutWallets = allUsers.filter(user => !usersWithWallets.has(user._id.toString()));

        console.log(`📊 Wallet Validation Report:`);
        console.log(`   Total Users: ${allUsers.length}`);
        console.log(`   Total Wallets: ${allWallets.length}`);
        console.log(`   Users without wallets: ${usersWithoutWallets.length}`);

        return {
            totalUsers: allUsers.length,
            totalWallets: allWallets.length,
            usersWithoutWallets: usersWithoutWallets.length,
            missingUsers: usersWithoutWallets.map(u => ({ id: u._id, email: u.email }))
        };

    } catch (error) {
        console.error('❌ Error validating wallets:', error);
        throw error;
    }
};

const deleteOrphanedWallets = async () => {
    const session = await mongoose.startSession();

    try {
        console.log('🔍 Finding orphaned wallets (wallets without users)...');

        await session.startTransaction();

        // Find wallets where the user doesn't exist
        const orphanedWallets = await Wallet.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $match: {
                    'userInfo': { $size: 0 }
                }
            },
            {
                $project: {
                    _id: 1,
                    user: 1,
                    referralCode: 1,
                    balance: 1
                }
            }
        ]).session(session);

        console.log(`📊 Found ${orphanedWallets.length} orphaned wallets`);

        if (orphanedWallets.length === 0) {
            console.log('✅ No orphaned wallets found. No action needed.');
            await session.commitTransaction();
            session.endSession();
            return {
                success: true,
                message: 'No orphaned wallets found',
                deleted: 0
            };
        }

        // Delete orphaned wallets
        const walletIds = orphanedWallets.map(wallet => wallet._id);
        const deleteResult = await Wallet.deleteMany(
            { _id: { $in: walletIds } },
            { session }
        );

        await session.commitTransaction();

        console.log(`🗑️ Successfully deleted ${deleteResult.deletedCount} orphaned wallets`);

        return {
            success: true,
            message: `Successfully deleted ${deleteResult.deletedCount} orphaned wallets`,
            deleted: deleteResult.deletedCount,
            orphanedWallets: orphanedWallets.map(w => ({
                id: w._id,
                user: w.user,
                referralCode: w.referralCode,
                balance: w.balance
            }))
        };

    } catch (error) {
        console.error('❌ Error in deleteOrphanedWallets:', error);
        await session.abortTransaction();

        return {
            success: false,
            message: 'Failed to delete orphaned wallets',
            error: error.message,
            deleted: 0
        };
    } finally {
        session.endSession();
    }
};

export {
    createMissingWallets,
    validateAllWallets,
    deleteOrphanedWallets
};