import express from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCoursesByCategory,
  getFeaturedCourses,
  getUpcomingCourses
} from '../controllers/courseController.js';

import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getCourses);

router.route('/featured')
  .get(getFeaturedCourses);

router.route('/upcoming')
  .get(getUpcomingCourses);

router.route('/category/:categoryId')
  .get(getCoursesByCategory);

router.route('/:id')
  .get(getCourse);

router.route('/')
  .post(protect, authorize('admin'), createCourse);

router.route('/:id')
  .put(protect, authorize('admin'), updateCourse)
  .delete(protect, authorize('admin'), deleteCourse);

export default router;