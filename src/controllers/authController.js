import crypto from 'crypto';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/generateToken.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendEmail } from '../utils/sendEmail.js';
import Otp from '../models/Otp.js';
import { Wallet } from "../models/Wallet.js";
import { startSession } from 'mongoose';
import { Resend } from 'resend';
import axios from 'axios';


function generateReferralCodeFromUserId(userId) {
  const idStr = userId.toString();
  const hash = crypto.createHash("sha256").update(idStr).digest("base64");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let referral = "";
  for (let i = 0; i < 8; i++) {
    const index = hash.charCodeAt(i) % chars.length;
    referral += chars[index];
  }
  return referral;
}



export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email });

    await Otp.create({ email, otp });

    try {
      await axios.post("https://otp-backend-main.vercel.app/api/send-otp", {
        "email": email,
        "otp": otp
      });
    } catch (error) {
      console.log(error?.response?.data)
    }

    // await sendEmail({
    //   email,
    //   subject: "OTP for Login",
    //   message: `Your OTP is ${otp}. It will expire in 5 minutes.`
    // });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};


export const verifyOtp = async (req, res) => {
  const session = await startSession();
  session.startTransaction();

  try {
    const { email, otp, referCode } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const record = await Otp.findOne({ email }).session(session);
    if (!record) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "OTP expired or not found" });
    }

    if (record.otp !== otp) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    let user = await User.findOne({ email }).session(session);
    let accessToken;

    if (user) {
      accessToken = generateAccessToken(user._id);
    } else {
      let referredBy = null;
      if (referCode) {
        const referrerWallet = await Wallet.findOne({ referralCode: referCode })
          .populate('user')
          .session(session);
        if (referrerWallet?.user) {
          referredBy = referrerWallet.user._id;
        }
      }
      user = await User.create([{
        email,
        role: "user",
        isVerified: true
      }], { session });

      user = user[0];

      const newWallet = await Wallet.create([{
        user: user._id,
        referredBy: referredBy || null,
        referralCode: generateReferralCodeFromUserId(user._id)
      }], { session });

      // Update referrer wallet if applicable
      if (referredBy) {
        await Wallet.findOneAndUpdate(
          { user: referredBy },
          {
            $inc: {
              balance: 50,
              totalEarned: 50,
              referralEarnings: 50,
              totalReferrals: 1
            }
          },
          { new: true, session }
        );
      }
      // await sendWelcomeEmail(user);
      accessToken = generateAccessToken(user._id);
    }

    await Otp.deleteOne({ email }).session(session);

    res.cookie("auth_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: "gatewayabroadeducations.com",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "OTP verified successfully",
      token: accessToken
    });

  } catch (error) {
    console.error("Error verifying OTP:", error);

    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

export const logout = async (req, res) => {
  try {
    let token;
    token = req.cookies.auth_token;
    if (token) {
      // res.clearCookie("auth_token", {
      //   httpOnly: true,
      //   secure: false,
      //   sameSite: "Lax"
      // });
      res.clearCookie("auth_token", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: "gatewayabroadeducations.com" // same as when you set it
      });
    }

    // const { refreshToken } = req.body;
    // const user = await User.findById(req.user.id);

    // if (refreshToken) {
    //   user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
    // } else {
    //   user.refreshTokens = [];
    // }
    // await user.save();

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    await sendPasswordResetEmail(user, resetToken);

    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokens = [];

    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const userPromise = User.findById(req.user.id)
      .populate('category', 'name icon')
      .populate('subCategory', 'name icon')
      .select('-refreshTokens');

    const walletPromise = Wallet.findOne({ user: req.user.id }).select('-__v');

    const [user, wallet] = await Promise.all([userPromise, walletPromise]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (!wallet) {
      console.warn(`Wallet missing for user: ${req.user.id}`);
    }
    res.json({
      success: true,
      data: user,
      wallet
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from middleware
    const {
      name,
      phoneNumber,
      address,
      profile,
      education,     // Teacher-specific
      experience,    // Teacher-specific
      skills,        // Teacher-specific
      socialLinks    // Teacher-specific
    } = req.body;

    const updateFields = {
      ...(name && { name }),
      ...(phoneNumber && { phoneNumber }),
      ...(address && { address }),
      ...(profile && { profile })
    };

    const user = await User.findById(userId);
    if (user && user.role === 'teacher') {
      if (education !== undefined) updateFields.education = education;
      if (experience !== undefined) updateFields.experience = experience;
      if (skills !== undefined) updateFields.skills = skills;
      if (socialLinks !== undefined) updateFields.socialLinks = socialLinks;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -refreshTokens");

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const updateUserCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, subCategory } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "At least one field (category) is required"
      });
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(category !== undefined && { category }),
          ...(subCategory !== undefined && { subCategory })
        }
      },
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    )

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error updating category",
    });
  }
};