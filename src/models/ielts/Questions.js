import mongoose from "mongoose";

const QUESTION_TYPES = {
  // Reading
  MCQ_SINGLE: "mcq_single",
  MCQ_MULTIPLE: "mcq_multiple",
  TRUE_FALSE_NG: "true_false_ng",
  YES_NO_NG: "yes_no_ng",
  MATCHING_HEADINGS: "matching_headings",
  MATCHING_INFORMATION: "matching_information",
  MATCHING_FEATURES: "matching_features",
  SENTENCE_COMPLETION: "sentence_completion",
  SUMMARY_COMPLETION: "summary_completion",
  NOTE_COMPLETION: "note_completion",
  TABLE_COMPLETION: "table_completion",
  FLOW_CHART_COMPLETION: "flow_chart_completion",
  DIAGRAM_LABELING: "diagram_labeling",
  SHORT_ANSWER: "short_answer",
  MATCHING_SENTENCE_ENDINGS: "matching_sentence_endings",
  CLASSIFICATION: "classification",

  // Listening
  FORM_COMPLETION: "form_completion",
  MATCHING: "matching",
  PLAN_LABELING: "plan_labeling",
  MAP_LABELING: "map_labeling",
  PICK_FROM_LIST: "pick_from_list",

  // Writing
  FORMAL_LETTER: "formal_letter",
  SEMI_FORMAL_LETTER: "semi_formal_letter",
  INFORMAL_LETTER: "informal_letter",
  OPINION: "opinion",
  DISCUSSION: "discussion",
  PROBLEM_SOLUTION: "problem_solution",
  ADVANTAGES_DISADVANTAGES: "advantages_disadvantages",
  DOUBLE_QUESTION: "double_question",

  // Speaking
  SPEAKING_PART_1: "speaking_part_1",
  SPEAKING_PART_2: "speaking_part_2",
  SPEAKING_PART_3: "speaking_part_3",
};

const questionSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ["reading", "listening", "writing", "speaking"],
      required: true,
      index: true,
    },
    questionType: {
      type: String,
      enum: Object.values(QUESTION_TYPES),
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: { type: String, default: null },
    choices: {
      type: [
        {
          label: { type: String, required: true },
          text: { type: String, required: true },
          isCorrect: { type: Boolean, default: false },
        },
      ],
      default: undefined,
    },
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    correctChoiceLabel: {
      type: String,
      default: null,
    },
    constraints: {
      maxWords: { type: Number, default: null },
      minWords: { type: Number, default: null },
      maxSelections: { type: Number, default: null },
      allowNumbers: { type: Boolean, default: true },
    },
    media: {
      passageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Passage",
        default: null,
      },
      audioUrl: { type: String, default: null },
      imageUrl: { type: String, default: null },
    },
    metadata: {
      difficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard"],
        default: "Medium",
      },
      taskType: { type: String, default: null }, // e.g. "Opinion Essay", "Formal Letter"
      topic: { type: String, default: null },
      cueCardPoints: { type: [String], default: undefined }, // For Speaking Part 2
      preparationTime: { type: Number, default: null }, // In seconds
      responseTime: { type: Number, default: null }, // In seconds
      minWords: { type: Number, default: null }, // For Writing (150 or 250)
      maxWords: { type: Number, default: null }, // Optional, for safety
    },
    marks: { type: Number, default: 1 },
    source: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("ieltsQuestion", questionSchema);