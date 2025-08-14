import express from 'express';
import {
  getDashboardStats,
  getCourseAnalytics,
  getUserAnalytics,
  getRevenueAnalytics
} from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/courses/:id', authorize('teacher', 'admin', 'super_admin'), getCourseAnalytics);
router.get('/users/:id', authorize('admin', 'super_admin'), getUserAnalytics);
router.get('/revenue', authorize('admin', 'super_admin'), getRevenueAnalytics);

export default router;