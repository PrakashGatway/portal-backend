import { Router } from 'express';
import * as ctrl from '../controllers/purchasedController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.route('/')
    .get(protect, ctrl.getUserPurchasedCourses);

router.route('/:id')
    .get(protect, ctrl.getPurchasedCourseById);

router.route('/:id/progress')
    .put(protect, ctrl.updateContentProgress);

export default router; 