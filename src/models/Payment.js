import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  type: {
    type: String,
    enum: ['course_purchase', 'subscription', 'certification', 'donation'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'razorpay', 'bank_transfer'],
    required: true
  },
  stripePaymentIntentId: String,
  stripeCustomerId: String,
  paypalOrderId: String,
  transactionId: String,
  invoice: {
    number: String,
    url: String,
    downloadUrl: String
  },
  refund: {
    amount: Number,
    reason: String,
    refundedAt: Date,
    stripeRefundId: String
  },
  metadata: {
    discount: {
      code: String,
      percentage: Number,
      amount: Number
    },
    tax: {
      amount: Number,
      rate: Number,
      country: String
    }
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ user: 1 });
paymentSchema.index({ course: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);