import mongoose from "mongoose";

const { Schema } = mongoose;

const TransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course" },
    type: {
      type: String,
      enum: [
        "purchase",
        "subscription",
        "refund",
        "discount",
        "admin_adjust",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    breakdown: {
      baseAmount: { type: Number },   // Before tax/discount
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 }
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "paypal", "wallet", "cod"],
      required: true,
    },
    transactionId: { type: String, required: true, unique: true },
    orderId: { type: String },
    invoiceNumber: { type: String },
    receiptUrl: { type: String },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded", "cancelled"],
      default: "pending",
    },
    reason: {
      type: String
    },
    refund: {
      isRefunded: { type: Boolean, default: false },
      refundId: { type: String },
      refundAmount: { type: Number },
      refundDate: { type: Date },
      reason: { type: String },
    },
    coupon: {
      code: { type: String },
      discountType: { type: String, enum: ["percentage", "fixed"] },
      discountValue: { type: Number },
    },
    meta: { type: Schema.Types.Mixed }, // Gateway raw response, logs, etc.
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", TransactionSchema);
