import express from 'express';
import {
  getTests,
  getTest,
  createTest,
  updateTest,
  deleteTest,
  submitTest,
  getTestSubmissions,
  gradeSubmission
} from '../controllers/testController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTests)
  .post(authorize('teacher', 'admin', 'super_admin'), createTest);

router.route('/:id')
  .get(getTest)
  .put(authorize('teacher', 'admin', 'super_admin'), updateTest)
  .delete(authorize('teacher', 'admin', 'super_admin'), deleteTest);

router.post('/:id/submit', submitTest);
router.get('/:id/submissions', authorize('teacher', 'admin', 'super_admin'), getTestSubmissions);
router.put('/submissions/:submissionId/grade', authorize('teacher', 'admin', 'super_admin'), gradeSubmission);

export default router;