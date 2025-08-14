import express from 'express';
import {
  getSubmissions,
  getSubmission,
  createSubmission,
  updateSubmission,
  gradeSubmission
} from '../controllers/submissionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSubmissions)
  .post(createSubmission);

router.route('/:id')
  .get(getSubmission)
  .put(updateSubmission);

router.put('/:id/grade', authorize('teacher', 'admin', 'super_admin'), gradeSubmission);

export default router;