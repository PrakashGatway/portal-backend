import mongoose from "mongoose";

const { Schema } = mongoose;

const questionAttemptSchema = new Schema(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "ieltsQuestion",
      required: true,
    },

    order: {
      type: Number,
      required: true,
    },

    answer: {
      type: Schema.Types.Mixed,
      default: null,
    },

    isCorrect: {
      type: Boolean,
      default: null,
    },

    obtainedMarks: {
      type: Number,
      default: 0,
    },

    skipped: {
      type: Boolean,
      default: false,
    },

    flagged: {
      type: Boolean,
      default: false,
    },

    timeSpent: {
      type: Number,
      default: 0,
    },

    answeredAt: {
      type: Date,
      default: null,
    },

    evaluation: {
      score: {
        type: Number,
        default: null,
      },

      feedback: {
        type: String,
        default: null,
      },

      strengths: {
        type: [String],
        default: undefined,
      },

      weaknesses: {
        type: [String],
        default: undefined,
      },

      evaluatedBy: {
        type: String,
        enum: ["system", "ai", "manual"],
        default: "system",
      },

      evaluatedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    _id: true,
  },
);

const questionSetAttemptSchema = new Schema(
  {
    questionSetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    order: {
      type: Number,
      required: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    timeSpent: {
      type: Number,
      default: 0,
    },

    questions: {
      type: [questionAttemptSchema],
      default: [],
    },
  },
  {
    _id: true,
  },
);

const groupAttemptSchema = new Schema(
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

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    timeSpent: {
      type: Number,
      default: 0,
    },

    questionSets: {
      type: [questionSetAttemptSchema],
      default: [],
    },
  },
  {
    _id: true,
  },
);

const sectionAnalysisSchema = new Schema(
  {
    rawScore: {
      type: Number,
      default: 0,
    },

    totalQuestions: {
      type: Number,
      default: 0,
    },

    attemptedQuestions: {
      type: Number,
      default: 0,
    },

    correctAnswers: {
      type: Number,
      default: 0,
    },

    incorrectAnswers: {
      type: Number,
      default: 0,
    },

    skippedQuestions: {
      type: Number,
      default: 0,
    },

    accuracy: {
      type: Number,
      default: 0,
    },

    bandScore: {
      type: Number,
      default: null,
    },

    timeSpent: {
      type: Number,
      default: 0,
    },

    averageTimePerQuestion: {
      type: Number,
      default: 0,
    },

    /* Mainly Writing / Speaking */

    aiScore: {
      type: Number,
      default: null,
    },

    feedback: {
      type: String,
      default: null,
    },

    strengths: {
      type: [String],
      default: undefined,
    },

    weaknesses: {
      type: [String],
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const sectionAttemptSchema = new Schema(
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

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    timeSpent: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },

    groups: {
      type: [groupAttemptSchema],
      default: [],
    },

    analysis: {
      type: sectionAnalysisSchema,
      default: () => ({}),
    },
  },
  {
    _id: true,
  },
);

const overallAnalysisSchema = new Schema(
  {
    totalQuestions: {
      type: Number,
      default: 0,
    },

    attemptedQuestions: {
      type: Number,
      default: 0,
    },

    correctAnswers: {
      type: Number,
      default: 0,
    },

    incorrectAnswers: {
      type: Number,
      default: 0,
    },

    skippedQuestions: {
      type: Number,
      default: 0,
    },

    accuracy: {
      type: Number,
      default: 0,
    },

    totalTimeSpent: {
      type: Number,
      default: 0,
    },

    averageTimePerQuestion: {
      type: Number,
      default: 0,
    },

    readingBand: {
      type: Number,
      default: null,
    },

    listeningBand: {
      type: Number,
      default: null,
    },

    writingBand: {
      type: Number,
      default: null,
    },

    speakingBand: {
      type: Number,
      default: null,
    },

    overallBand: {
      type: Number,
      default: null,
    },

    summary: {
      type: String,
      default: null,
    },

    strengths: {
      type: [String],
      default: undefined,
    },

    weaknesses: {
      type: [String],
      default: undefined,
    },

    recommendations: {
      type: [String],
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const ieltsAttemptSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    test: {
      type: Schema.Types.ObjectId,
      ref: "ieltsTest",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "not_started",
        "in_progress",
        "paused",
        "submitted",
        "evaluating",
        "completed",
        "abandoned",
      ],
      default: "not_started",
      index: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    lastActivityAt: {
      type: Date,
      default: null,
    },

    lastSavedAt: {
      type: Date,
      default: null,
    },

    pausedAt: {
      type: Date,
      default: null,
    },

    currentSection: {
      type: String,
      enum: ["reading", "listening", "writing", "speaking", null],
      default: null,
    },

    currentSectionIndex: {
      type: Number,
      default: 0,
    },

    currentGroupIndex: {
      type: Number,
      default: 0,
    },

    currentQuestionSetIndex: {
      type: Number,
      default: 0,
    },

    currentQuestionIndex: {
      type: Number,
      default: 0,
    },

    sections: {
      type: [sectionAttemptSchema],
      default: [],
    },

    score: {
      reading: {
        type: Number,
        default: null,
      },

      listening: {
        type: Number,
        default: null,
      },

      writing: {
        type: Number,
        default: null,
      },

      speaking: {
        type: Number,
        default: null,
      },

      overall: {
        type: Number,
        default: null,
      },
    },
    analysis: {
      type: overallAnalysisSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

ieltsAttemptSchema.index({
  user: 1,
  test: 1,
  createdAt: -1,
});

export default mongoose.model("IeltsAttempt", ieltsAttemptSchema);