import express from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  addReview,
  getCourseLessons
} from '../controllers/courseController.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getCourses)
  .post(protect, authorize('teacher', 'admin', 'super_admin'), createCourse);

router.route('/:id')
  .get(optionalAuth, getCourse)
  .put(protect, authorize('teacher', 'admin', 'super_admin'), updateCourse)
  .delete(protect, authorize('teacher', 'admin', 'super_admin'), deleteCourse);

router.post('/:id/reviews', protect, addReview);
router.get('/:id/lessons', protect, getCourseLessons);

export default router;