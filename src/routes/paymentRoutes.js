import express from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  getPayments,
  refundPayment,
  webhookHandler
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Webhook route (no auth required)
router.post('/webhook', webhookHandler);

router.use(protect);

router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.get('/', getPayments);
router.post('/:id/refund', authorize('admin', 'super_admin'), refundPayment);

export default router;