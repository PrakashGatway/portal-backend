// routes/content.js
import express from 'express';
import {
    getAllContent,
    getContentByType,
    getContent,
    createLiveClass,
    createRecordedClass,
    createTest,
    createStudyMaterial,
    updateContent,
    deleteContent,
    getContentStats,
    getUpcomingLiveClasses,
    getCourseContentStructure,
    updateContentStatus
} from '../controllers/contentController.js';

import { protect, authorize, ensureCoursePurchase } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(getAllContent);

router.route('/stats')
    .get(getContentStats);

router.route('/type/:type')
    .get(getContentByType);

router.route('/liveclass/upcoming')
    .get(getUpcomingLiveClasses);

router.route('/course/:courseId/structure')
    .get(protect, getCourseContentStructure);

router.route('/:id/:courseId')
    .get(protect, ensureCoursePurchase, getContent);

router.route('/liveclass')
    .post(protect, authorize('teacher', 'admin'), createLiveClass);

router.route('/recordedclass')
    .post(protect, authorize('teacher', 'admin'), createRecordedClass);

router.route('/test')
    .post(protect, authorize('teacher', 'admin'), createTest);

router.route('/studymaterial')
    .post(protect, authorize('teacher', 'admin'), createStudyMaterial);

router.route('/:id')
    .put(protect, authorize('teacher', 'admin'), updateContent)
    .delete(protect, authorize('admin'), deleteContent);

router.route("/status/:id")
    .put(protect, authorize('teacher', 'admin'), updateContentStatus)


export default router;