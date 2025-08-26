// routes/categories.js
import express from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubcategories,
  getRootCategories,
  getCategoryTree
} from '../controllers/categoriesController.js';

import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getCategories);

router.route('/root')
  .get(getRootCategories);

router.route('/tree')
  .get(getCategoryTree);

router.route('/:id')
  .get(getCategory);

router.route('/:id/subcategories')
  .get(getSubcategories);

router.route('/')
  .post(protect, authorize('admin'), createCategory);

router.route('/:id')
  .put(protect, authorize('admin'), updateCategory)
  .delete(protect, authorize('admin'), deleteCategory);

export default router;