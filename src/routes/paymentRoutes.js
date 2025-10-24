import express from 'express';
import {
  getUserTransactions,
  getTransaction,
  updateTransactionStatus,
  processRefund,
  getTransactionStats, createPayment,
  getAdminTransactions,
  handlePaymentWebhook
} from '../controllers/paymentController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/webhook', handlePaymentWebhook)

router.use(protect);

router.get('/', getUserTransactions);

router.post('/create', createPayment)

router.get('/all', authorize('admin'), getAdminTransactions)

router.get('/:id', getTransaction);

router.put('/:id/status', authorize('admin'), updateTransactionStatus);

router.post('/:id/refund', processRefund);

router.get('/stats', getTransactionStats);

export default router;