import express from 'express';
import { 
  validateReferralCode, 
  getReferralHistory, 
  getWallet
} from '../controllers/walletController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getWallet);
router.post('/validate', validateReferralCode);
router.get('/history', protect, getReferralHistory);

export default router;