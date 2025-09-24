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

walletSchema.pre('save', async function (next) {
    if (!this.isNew) {
        next();
        return;
    }
    let referralCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        const user = await mongoose.model('User').findById(this.user);
        const name = user?.name || user?.email || 'GA';
        referralCode = generateReferralCode(name);
        const existingWallet = await mongoose.model('Wallet').findOne({ referralCode });
        if (!existingWallet) {
            isUnique = true;
        } else {
            attempts++;
        }
    }
    if (!isUnique) {
        throw new Error('Could not generate unique referral code');
    }
    this.referralCode = referralCode;
    next();
});

function generateReferralCode(name) {
    const cleanName = name ? name.replace(/\s+/g, '') : 'G';
    const base = cleanName.substring(0, Math.min(2, cleanName.length)).toUpperCase();
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomSuffix = '';
    for (let i = 0; i < (8 - base.length); i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomSuffix += characters[randomIndex];
    }
    return `${base}${randomSuffix}`;
}

export const Wallet = mongoose.model('Wallet', walletSchema);