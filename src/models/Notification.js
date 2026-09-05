import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    isGlobal: {
      type: Boolean,
      default: false,
      index: true,
    },
    notificationKey: {
      type: String,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    from: {
      type: String,
      required: false,
    },
    to: {
      type: String,
      required: false,
    },
    Category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    type: {
      type: String,
      enum: [
        "course",
        "offer",
        "reminder",
        "announcement",
        "payment",
        "system",
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    data: {
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      contentId: { type: mongoose.Schema.Types.ObjectId, ref: "Content" },
      testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
      url: String,
      actionText: String,
    },
    proceedStatus:{
      type: Boolean,
      default: false
    },
    scheduledFor:{
      type: Date,
      default: null,
    },
    metaInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ type: 1 });
notificationSchema.index({ scheduledFor: 1 });

const notificationRecipientSchema = new mongoose.Schema(
  {
    notification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      index: true,
      expires: 0, // TTL index - doc auto-removed once expiresAt passes, if set
    },
    meta:{
      email:String,
      push:String,
      sms:String
    }
  },
  {
    timestamps: true,
  },
);

notificationRecipientSchema.index(
  { notification: 1, user: 1 },
  { unique: true },
);

const NotificationRec = mongoose.model(
  "NotificationRec",
  notificationRecipientSchema,
);
const Notification = mongoose.model("Notification", notificationSchema);

export { Notification, NotificationRec };