import mongoose from "mongoose";

const fcmTokenipientSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

fcmTokenipientSchema.index({ token: 1, user: 1 }, { unique: true });

fcmTokenipientSchema.index({ user: 1 });

const fcmToken = mongoose.model(
  "fcmToken",
  fcmTokenipientSchema
);

export { fcmToken };
