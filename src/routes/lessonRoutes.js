import express from 'express';
import {
  getLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  completeLesson,
  addInteraction
} from '../controllers/lessonController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getLessons)
  .post(authorize('teacher', 'admin', 'super_admin'), createLesson);

router.route('/:id')
  .get(getLesson)
  .put(authorize('teacher', 'admin', 'super_admin'), updateLesson)
  .delete(authorize('teacher', 'admin', 'super_admin'), deleteLesson);

router.post('/:id/complete', completeLesson);
router.post('/:id/interact', addInteraction);

export default router;