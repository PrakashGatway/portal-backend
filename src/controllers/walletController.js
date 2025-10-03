import User from "../models/User.js";
import { Wallet } from "../models/Wallet.js";


export const getWallet = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ user: req.user._id }).select('-__v');
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        res.status(200).json({ success: true, wallet });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const validateReferralCode = async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ success: false, message: 'Referral code is required' });
    }

    try {
        const referrerWallet = await Wallet.findOne({ referralCode: code }).populate('user', 'name email');
        if (!referrerWallet) {
            return res.status(404).json({ success: false, message: 'Invalid referral code' });
        }

        res.status(200).json({
            success: true,
            message: 'Valid referral code'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const awardReferralReward = async (referredUserId, referrerUserId) => {
    try {
        const rewardAmount = 50;

        const updatedWallet = await Wallet.findOneAndUpdate(
            { user: referrerUserId },
            {
                $inc: {
                    balance: rewardAmount,
                    totalEarned: rewardAmount,
                    referralEarnings: rewardAmount,
                    totalReferrals: 1
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedWallet) {
            console.warn(`Wallet not found for user ${referrerUserId}`);
            return false;
        }

        console.log(`Awarded ₹${rewardAmount} to user ${referrerUserId} for referring ${referredUserId}`);
        return true;
    } catch (error) {
        console.error('Error awarding referral reward:', error);
        return false;
    }
};

export const getReferralHistory = async (req, res) => {
  try {
    const referredUsers = await Wallet.find({ referredBy: req.user._id })
      .populate("user", "email name").limit(20).select('-balance -totalEarned -totalSpent -referralCode')

    res.status(200).json({
      success: true,
      referrals: referredUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
