import mongoose from "mongoose";

const { Schema } = mongoose;

const ieltsTestSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    instructions: {
      type: String,
      default: null,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category"
    },
    testType: {
      type: String,
      enum: [
        "full_length",
        "sectional",
        "mini_test",
        "practice",
        "quiz",
        "mock",
      ],
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard", "Mixed"],
      default: "Mixed",
    },
    sections: [
      {
        section: {
          type: String,
          enum: ["reading", "listening", "writing", "speaking"],
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        duration: {
          type: Number,
          default: 0,
        },
        questionCount: {
          type: Number,
          default: 0,
        },
        groups: [
          {
            group: {
              type: Schema.Types.ObjectId,
              ref: "ieltsGroupQuestion",
              required: true,
            },

            order: {
              type: Number,
              required: true,
            },
          },
        ],
      },
    ],
    duration: {
      type: Number,
      default: 0,
    },
    pricing: {
      isFree: {
        type: Boolean,
        default: true,
      },
      currency: {
        type: String,
        default: "INR",
      },
      regularPrice: {
        type: Number,
        default: 0,
        min: 0,
      },
      salePrice: {
        type: Number,
        default: 0,
        min: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    settings: {
      randomizeQuestions: {
        type: Boolean,
        default: false,
      },
      showTimer: {
        type: Boolean,
        default: true,
      },
    },
    scoring: {
      passingBand: {
        type: Number,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("ieltsTest", ieltsTestSchema);
