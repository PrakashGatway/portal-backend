import express from 'express';
import {
  logout,
  getMe,
  sendOtp,
  verifyOtp,
  updateUserProfile,
  updateUserCategory,
  checkEmailExists
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/verify_email', checkEmailExists);
router.post('/send_otp', sendOtp);
router.post('/verify_otp', verifyOtp);
router.get('/logout', protect, logout);

// router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.post('/profile', protect, updateUserProfile)
router.put('/categories', protect, updateUserCategory)

export default router;