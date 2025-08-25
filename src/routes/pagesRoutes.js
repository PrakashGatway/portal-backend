import express from 'express';
import {
    createPage,
    getPages,
    getPageBySlug,
    updatePage,
    deletePage,
    getPagesByType,
} from '../controllers/pageController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const validatePageData = (req, res, next) => {
    const { title, slug, pageType } = req.body;

    if (!title || !slug || !pageType) {
        return res.status(400).json({
            success: false,
            message: 'Title, slug, and pageType are required'
        });
    }

    next();
};

const validateObjectId = (req, res, next) => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
    }
    next();
};

router.post('/', protect, authorize('admin', 'super_admin'), validatePageData, createPage);
router.get('/', getPages);
// router.get('/:id', validateObjectId, getPageById);
router.put('/:id', protect, authorize('admin', 'super_admin'), validateObjectId, updatePage);
router.delete('/:id', protect, authorize('admin', 'super_admin'), validateObjectId, deletePage);

router.get('/list/type', getPagesByType);
router.get('/:slug', getPageBySlug);

export default router;