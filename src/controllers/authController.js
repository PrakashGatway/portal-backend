import crypto from 'crypto';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/generateToken.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendEmail } from '../utils/sendEmail.js';
import Otp from '../models/Otp.js';

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email });

    await Otp.create({ email, otp });

    await sendEmail({
      email,
      subject: "OTP for Login",
      message: `Your OTP is ${otp}. It will expire in 5 minutes.`
    });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const record = await Otp.findOne({ email });
    if (!record) {
      return res.status(400).json({ success: false, message: "OTP expired or not found" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    let user = await User.findOne({ email });
    let accessToken;

    if (user) {
      accessToken = generateAccessToken(user._id);
    } else {
      user = await User.create({
        email,
        role: "user",
        isVerified: true
      });
      await sendWelcomeEmail(user);

      accessToken = generateAccessToken(user._id);
    }

    // res.cookie("auth_token", accessToken, {
    //   httpOnly: true,
    //   secure: false,
    //   sameSite: "Lax"
    // });

    res.cookie("auth_token", accessToken, {
      httpOnly: true,
      secure: true, // Always true in production
      sameSite: "None", // Required for cross-subdomain cookies
      domain: "gatewayabroadeducations.com", // Works for www.domain
      maxAge: 7 * 24 * 60 * 60 * 1000
    });


    res.json({
      success: true,
      message: "OTP verified successfully",
      token: accessToken
    });

    await Otp.deleteOne({ email });
  } catch (error) {
    console.error("Error verifying OTP:", error);
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

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send reset email
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
    user.refreshTokens = []; // Clear all refresh tokens

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
    const user = await User.findById(req.user.id)
      .populate('courses.course', 'title thumbnail')
      .select('-refreshTokens');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
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
      profile
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(name && { name }),
          ...(phoneNumber && { phoneNumber }),
          ...(address && { address }),
          ...(profile && { profile })
        }
      },
      { new: true, runValidators: true }
    ).select("-password -refreshTokens"); // don't expose sensitive data

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};