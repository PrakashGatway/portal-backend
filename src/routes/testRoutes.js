import { Router } from 'express';
import {
    getExams,
    getExamById,
    createExam,
    updateExam,
    deleteExam,
    toggleExamActive,
} from '../controllers/TestSeries/examController.js';
import {
    createSection,
    getSections,
    getSectionById,
    updateSection,
    deleteSection,
} from '../controllers/TestSeries/sectionsController.js';
import {
    getTestSeries,
    getTestSeriesById,
    createTestSeries,
    updateTestSeries,
    toggleActive,
    deleteTestSeries,
} from '../controllers/TestSeries/testSeriesController.js';

import * as ctrl from '../controllers/TestSeries/questionController.js';
import { protect } from '../middleware/auth.js'; 


const router = Router();

router.route('/exams/')
    .get(getExams)
    .post(createExam);

router.route('/exams/:id')
    .get(getExamById)
    .put(updateExam)
    .delete(deleteExam);

router.patch('/exams/:id/toggle-active', toggleExamActive);

router.route('/sections')
    .post(createSection)
    .get(getSections);

router.route('/sections/:id')
    .get(getSectionById)
    .put(updateSection)
    .delete(deleteSection);


router.get('/series', getTestSeries);
router.get('/series/:idOrSlug', getTestSeriesById);

router.post('/series', createTestSeries);
router.put('/series/:id', updateTestSeries);
router.patch('/series/:id/toggle-active', toggleActive);
router.delete('/series/:id', deleteTestSeries);

router.route('/questions')
  .get(ctrl.getAllQuestions)
  .post(protect, ctrl.createQuestion);

router.route('/questions/:id')
  .get(ctrl.getQuestion)
  .put(protect, ctrl.updateQuestion)
  .delete(protect, ctrl.deleteQuestion);

export default router;