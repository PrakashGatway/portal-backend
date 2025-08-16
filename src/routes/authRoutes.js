import express from 'express';
import {
  logout,
  getMe,
  sendOtp,
  verifyOtp,
  updateUserProfile
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/send_otp', sendOtp);
router.post('/verify_otp', verifyOtp);
router.get('/logout', protect, logout);

// router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.post('/profile', protect, updateUserProfile)

export default router;