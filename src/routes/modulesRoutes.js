// routes/modules.js
import express from 'express';
import {
  getModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  getModuleStats,
  getModulesByCourse,
  getModuleContentStructure
} from '../controllers/modulesController.js';

import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getModules);

router.route('/stats')
  .get(getModuleStats);

router.route('/course/:courseId')
  .get(getModulesByCourse);

router.route('/:id')
  .get(getModule);

router.route('/:id/content')
  .get(getModuleContentStructure);

router.route('/')
  .post(protect, authorize('teacher', 'admin'), createModule);

router.route('/:id')
  .put(protect, authorize('teacher', 'admin'), updateModule)
  .delete(protect, authorize('admin'), deleteModule);

export default router;