import express from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCoursesByCategory,
  getFeaturedCourses,
  getUpcomingCourses,
  getCourseCurriculum
} from '../controllers/courseController.js';

import { protect, authorize, ensureCoursePurchase } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getCourses);

router.route('/featured')
  .get(protect, getFeaturedCourses);

router.route('/upcoming')
  .get(protect, getUpcomingCourses);

router.route('/category/:categoryId')
  .get(protect, getCoursesByCategory);

router.route('/:id')
  .get(protect, getCourse);

router.route('/curriculum/:courseId')
  .get(protect, ensureCoursePurchase, getCourseCurriculum);

router.route('/')
  .post(protect, authorize('admin'), createCourse);

router.route('/:id')
  .put(protect, authorize('admin'), updateCourse)
  .delete(protect, authorize('admin'), deleteCourse);

export default router;