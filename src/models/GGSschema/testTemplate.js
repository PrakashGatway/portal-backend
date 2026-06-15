// models/testTemplate.model.ts
import { Schema, model } from "mongoose";

const sectionInTestSchema = new Schema({
  section: {
    type: Schema.Types.ObjectId,
    ref: "Section",
    required: true,
  },
  customName: String,
  order: { type: Number, default: 1 },
  durationMinutes: Number,
  questionCount: Number,
  selectionMode: {
    type: String,
    enum: ["fixed", "random"],
    default: "fixed",
  },
  questions: [
    {
      type: Schema.Types.ObjectId,
      ref: "Question",
    },
  ],
  randomConfig: {
    questionTypes: [String],
    difficulties: [String],
    tags: [String],
    questionCount: Number,
  },
});

// Quiz config (same exam, same-type/mixed-types)
const quizConfigSchema = new Schema({
  mode: {
    type: String,
    enum: ["single_type", "mixed_types"],
    default: "single_type",
  },
  allowedQuestionTypes: [String],
  difficulties: [String],
  tags: [String],
  totalQuestions: Number,
  durationMinutes: Number,
});

// ⭐ NEW pricing block for a single test
const testPricingSchema = new Schema(
  {
    isSellable: { type: Boolean, default: true }, 
    isFree: { type: Boolean, default: false },    
    price: { type: Number, default: 0 },      
    salePrice: { type: Number },                
    currency: { type: String, default: "INR" },
    seriesOnly: { type: Boolean, default: false },
  },
  { _id: false }
);

const testTemplateSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,

    exam: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    series: [
      {
        type: Schema.Types.ObjectId,
        ref: "TestSeries",
      },
    ],
    testType: {
      type: String,
      enum: ["full_length", "sectional", "quiz"],
      required: true,
    },
    difficultyLabel: {
      type: String,
      enum: ["Easy", "Medium", "Hard", "Mixed"],
      default: "Mixed",
    },
    sections: [sectionInTestSchema],
    quizConfig: quizConfigSchema,
    totalDurationMinutes: Number,
    totalQuestions: Number,
    pricing: testPricingSchema,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

testTemplateSchema.index({ exam: 1, testType: 1 });

export const TestTemplate = model("TestTemplate", testTemplateSchema);
