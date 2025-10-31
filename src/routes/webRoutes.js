import { Router } from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/Websites/blogCategories.js';


import {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  toggleArticleStatus
} from '../controllers//Websites/blogController.js';

const router = Router();

router.route('/cat/')
  .get(getCategories)
  .post(createCategory);

router.route('/cat/:id')
  .get(getCategory)
  .put(updateCategory)
  .delete(deleteCategory);

router.get('/blog/', getArticles);
router.get('/blog/:id', getArticle);

router.post('/blog/', createArticle);
router.put('/blog/:id', updateArticle);
router.delete('/blog/:id', deleteArticle);
router.patch('/blog/:id/status', toggleArticleStatus);


export default router;