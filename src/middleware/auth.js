import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    const cookieToken = req.cookies.auth_token;

    if (!cookieToken) {
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
    } else {
      token = cookieToken;
    }

    if (!token) {
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
      return res.status(400).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({_id:decoded.id,isActive:true})
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
    }

    user.lastActive = new Date();
    await user.save();
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password -refreshTokens');

        if (user) {
          user.lastActive = new Date();
          await user.save();
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    next();
  }
};