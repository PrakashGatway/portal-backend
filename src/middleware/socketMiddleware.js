import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};

  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
};

export const socketAuth = async (socket, next) => {
  try {
    let token;

    if (socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    }
    else if (socket.handshake.headers?.cookie) {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      token = cookies['auth_token'];
    }
    else if (socket.handshake.headers?.authorization?.startsWith('Bearer')) {
      token = socket.handshake.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
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

    socket.user = user;
    socket.userId = user._id.toString();

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new Error('Authentication error: Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new Error('Authentication error: Token expired'));
    } else {
      next(new Error('Authentication error: ' + error.message));
    }
  }
};