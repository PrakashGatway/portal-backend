import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },

    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
    },

    type: {
      type: String,
      enum: ["report_issue", "rate_video"],
      required: true,
    },

    // Common
    message: {
      type: String,
      trim: true,
    },

    // Report Issue
    issueType: {
      type: String,
    },

    description: {
      type: String,
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },

    specificIssue: {
      type: String,
    },

    errorTime: {
      hours: {
        type: Number,
        default: 0,
      },
      minutes: {
        type: Number,
        default: 0,
      },
      seconds: {
        type: Number,
        default: 0,
      },
    },

    isPresentThroughout: {
      type: Boolean,
      default: false,
    },

    screenshot: {
      type: String,
    },

    // Rate Video
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);
const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;