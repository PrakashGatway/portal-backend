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


router.get('/', getTestSeries);
router.get('/:idOrSlug', getTestSeriesById);

router.post('/', createTestSeries);
router.put('/:id', updateTestSeries);
router.patch('/:id/toggle-active', toggleActive);
router.delete('/:id', deleteTestSeries);


export default router;