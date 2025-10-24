import { Router } from 'express';
import * as ctrl from '../controllers/TestSeries/examController.js';
import {
    createSection,
    getSections,
    getSectionById,
    updateSection,
    deleteSection,
} from '../controllers/TestSeries/sectionsController.js';


const router = Router();

router.post('/exams', ctrl.createExam);
router.get('/exams', ctrl.getExams);
router.get('/exams/:id', ctrl.getExamById);
router.put('/exams/:id', ctrl.updateExam);
router.delete('/exams/:id', ctrl.deleteExam);

router.route('/sections')
    .post(createSection)
    .get(getSections);

router.route('/sections/:id')
    .get(getSectionById)
    .put(updateSection)
    .delete(deleteSection);

export default router;