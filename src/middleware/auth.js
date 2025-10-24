import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PurchasedCourse from '../models/PurchasedCourse.js';

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
    const user = await User.findOne({ _id: decoded.id, isActive: true })
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

export const ensureCoursePurchase = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const purchase = await PurchasedCourse.findOne({
      user: userId,
      course: courseId,
      isActive: true,
      $or: [
        { accessExpiresAt: { $exists: false } },
        { accessExpiresAt: { $gte: new Date() } }
      ]
    });

    req.hasPurchasedCourse = !!purchase;
    next();
  } catch (error) {
    console.error('Purchase check error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
};

export const ensureCourseQuery = async (req, res, next) => {
  try {
    const { course } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const purchase = await PurchasedCourse.findOne({
      user: userId,
      course: course,
      isActive: true,
      $or: [
        { accessExpiresAt: { $exists: false } },
        { accessExpiresAt: { $gte: new Date() } }
      ]
    });

    req.hasPurchasedCourse = !!purchase;
    next();
  } catch (error) {
    console.error('Purchase check error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
};