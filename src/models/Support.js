import { Schema, model } from "mongoose";

const replySchema = new Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // true = support agent, false = user
    isSupport: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    _id: true,
  },
);

const supportTicketSchema = new Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "account",
        "payment",
        "technical",
        "content",
        "billing",
        "feature_request",
        "general",
        "other",
      ],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    replies: [replySchema],

    relatedTo: {
      type: Schema.Types.ObjectId,
      refPath: "relatedModel",
    },
    relatedModel: {
      type: String,
      enum: ["Order", "Course", "TestSeries", "Question", "PromoCode", "None"],
      default: "None",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    extraInfo: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);
supportTicketSchema.pre("save", async function (next) {
  if (!this.isNew || this.ticketId) {
    return next();
  }
  const count = await this.constructor.countDocuments();
  const sequence = String(count + 1);
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  this.ticketId = `TKT-${date}${sequence}`;
  next();
});

supportTicketSchema.index({ userId: 1 });
supportTicketSchema.index({ ticketId: 1 }, { unique: true });

export const SupportTicket = model("SupportTicket", supportTicketSchema);
