import { Schema, model, Types } from "mongoose";

const attemptQuestionSchema = new Schema(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "McuQuestion", // your Question model
      required: true,
    },
    order: { type: Number, default: 1 },
    answerOptionIndexes: [Number], // for MCQ; can be multiple
    answerText: String,
    selections: {
      type: Map,
      of: Schema.Types.Mixed, // number | string
    },
    dropdownSelections: {
      type: Map,
      of: Number,
    },
    evaluationMeta: Schema.Types.Mixed,
    isAnswered: { type: Boolean, default: false },
    markedForReview: { type: Boolean, default: false },
    timeSpentSeconds: { type: Number, default: 0 },
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
  },
  { _id: false }
);

const attemptSectionSchema = new Schema(
  {
    sectionConfigId: {
      type: Schema.Types.ObjectId, // _id of section config inside TestTemplate.sections[]
    },
    sectionRef: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: false,
    },
    name: String,
    durationMinutes: Number,
    startedAt: Date,
    endedAt: Date,
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    questions: [attemptQuestionSchema],
    stats: {
      correct: { type: Number, default: 0 },
      incorrect: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      rawScore: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const testAttemptSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gmatMeta: {
      type: {
        orderChosen: { type: Boolean, default: false },
        moduleOrder: {
          type: [Number],
          default: [],
        },
        phase: {
          type: String,
          enum: [
            "intro",
            "select_order",
            "section_instructions",
            "in_section",
            "review",
            "break",
          ],
          default: "intro",
        },
        currentSectionIndex: { type: Number, default: 0 },
        currentQuestionIndex: { type: Number, default: 0 },
        onBreak: { type: Boolean, default: false },
        breakExpiresAt: { type: Date, default: null },
      },
      default: {},
    },

    exam: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },

    testTemplate: {
      type: Schema.Types.ObjectId,
      ref: "TestTemplate",
      required: true,
      index: true,
    },

    testType: {
      type: String,
      enum: ["full_length", "sectional", "quiz"],
      required: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "cancelled", "expired"],
      default: "in_progress",
      index: true,
    },
    analysisStatus: {
      type: Boolean,
      default: false
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,

    totalDurationMinutes: Number, // from TestTemplate
    totalTimeUsedSeconds: { type: Number, default: 0 },
    sections: [attemptSectionSchema],

    overallStats: {
      totalQuestions: { type: Number, default: 0 },
      totalAttempted: { type: Number, default: 0 },
      totalCorrect: { type: Number, default: 0 },
      totalIncorrect: { type: Number, default: 0 },
      totalSkipped: { type: Number, default: 0 },
      rawScore: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

testAttemptSchema.index({ user: 1, testTemplate: 1, status: 1 });

export const TestAttempt = model("TestAttempt", testAttemptSchema);
