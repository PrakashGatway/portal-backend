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
        "referral_bonus",
        "purchase_bonus",
        "course_purchase",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    breakdown: {
      baseAmount: { type: Number },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      creditsUsed: { type: Number, default: 0 },
      creditsEarned: { type: Number, default: 0 }
    },
    paymentMethod: {
      type: String,
      enum: ["wallet", "bank"],
      required: true,
    },
    transactionId: { type: String, required: true, unique: true },
    orderId: { type: String, unique: true },
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
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ transactionId: 1 });

TransactionSchema.pre("save", async function (next) {
  if (!this.orderId) {
    try {
      const lastTransaction = await mongoose
        .model("Transaction")
        .findOne({})
        .sort({ createdAt: -1 })
        .select("orderId");

      let nextOrderNumber = 1000;
      if (lastTransaction && lastTransaction.orderId) {
        const lastNumber = parseInt(lastTransaction.orderId.replace("ORD-", ""), 10);
        nextOrderNumber = lastNumber + 1;
      }

      this.orderId = `ORD-${nextOrderNumber}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

export default mongoose.model("Transaction", TransactionSchema);