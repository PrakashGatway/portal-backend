import express from 'express';
import {
    createPage,
    getPages,
    getPageById,
    getPageBySlug,
    updatePage,
    deletePage,
} from '../controllers/pageController.js';

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

router.post('/', validatePageData, createPage);
router.get('/', getPages);
router.get('/:id', validateObjectId, getPageById);
router.put('/:id', validateObjectId, updatePage);
router.delete('/:id', validateObjectId, deletePage);

router.get('/:slug', getPageBySlug);

export default router;