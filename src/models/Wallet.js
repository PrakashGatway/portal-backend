import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    referralCode: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    totalReferrals: {
        type: Number,
        default: 0
    },
    referralEarnings: {
        type: Number,
        default: 0
    },
    totalPurchaseBonuses: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

walletSchema.index({ user: 1 });
walletSchema.index({ referralCode: 1 });

export const Wallet = mongoose.model('Wallet', walletSchema);