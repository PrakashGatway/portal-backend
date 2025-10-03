import express from 'express';
import { 
    getAllPromoCodes, 
    getPromoCodeById, 
    createPromoCode, 
    updatePromoCode, 
    deletePromoCode,
    validatePromoCode,
    applyPromoCode
} from '../controllers/promocodeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getAllPromoCodes)
    .post(protect, authorize('admin', 'super_admin'), createPromoCode);

router.route('/:id')
    .get(protect, getPromoCodeById)
    .put(protect, authorize('admin', 'super_admin'), updatePromoCode)
    .delete(protect, authorize('admin', 'super_admin'), deletePromoCode);

router.post('/validate',protect, validatePromoCode);
router.post('/apply', applyPromoCode);

export default router;