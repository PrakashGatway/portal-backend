import mongoose from "mongoose";

const groupQuestionSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ["reading", "listening", "writing", "speaking"],
      required: true,
      index: true,
    },
    groupType: {
      type: String,
      enum: [
        "reading_passage",
        "listening_section",
        "matching",
        "summary",
        "table",
        "flow_chart",
        "map",
        "form",
        "writing_task",
        "speaking_topic",
      ],
      default: null,
    },
    title: {
      type: String,
      default: null,
      trim: true,
    },
    instructions: {
      type: String,
      default: null,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ieltsQuestion",
      },
    ],
    passage: {
      type :mongoose.Schema.Types.ObjectId,
      ref: "IeltsPassage"
    },
    content: {
      type: String,
      default: null,
    },
    choices: {
      type: [
        {
          label: {
            type: String,
            required: true,
          },

          text: {
            type: String,
            required: true,
          },
        },
      ],
      default: undefined,
    },
    media: {
      audioUrl: {
        type: String,
        default: null,
      },
      imageUrl: {
        type: String,
        default: null,
      },
    },
    questionRange: {
      from: {
        type: Number,
        default: null,
      },
      to: {
        type: Number,
        default: null,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("ieltsGroupQuestion", groupQuestionSchema);
