import express from 'express';
import {
  getLiveClasses,
  getLiveClass,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
  joinClass,
  leaveClass,
  startClass,
  endClass
} from '../controllers/liveClassController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getLiveClasses)
  .post(authorize('teacher', 'admin', 'super_admin'), createLiveClass);

router.route('/:id')
  .get(getLiveClass)
  .put(authorize('teacher', 'admin', 'super_admin'), updateLiveClass)
  .delete(authorize('teacher', 'admin', 'super_admin'), deleteLiveClass);

router.post('/:id/join', joinClass);
router.post('/:id/leave', leaveClass);
router.post('/:id/start', authorize('teacher', 'admin', 'super_admin'), startClass);
router.post('/:id/end', authorize('teacher', 'admin', 'super_admin'), endClass);

export default router;