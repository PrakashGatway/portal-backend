import { Router } from 'express';
import * as ctrl from '../controllers/purchasedCourse.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.route('/')
    .post(protect, ctrl.enrollInCourse)
    .get(protect, ctrl.getUserPurchasedCourses);

router.route('/:id')
    .get(protect, ctrl.getPurchasedCourseById);

router.route('/:id/progress')
    .patch(protect, ctrl.updateContentProgress);

router.route('/:id/next')
    .get(protect, ctrl.getNextContent);

export default router;