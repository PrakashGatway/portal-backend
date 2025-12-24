// question.model.ts
import { Schema, model } from "mongoose";

let pteType = [
  { value: "read_aloud", label: "PTE-Read Aloud" },
  { value: "repeat_sentence", label: "PTE-Repeat Sentence" },
  { value: "describe_image", label: "PTE-Describe Image" },
  { value: "retell_lesson", label: "PTE-Retell Lesson" },
  { value: "short_answer", label: "PTE-Short Answer" },
  { value: "pte_summarize_writing", label: "PTE-Summarize Writing" },
  { value: "pte_situational", label: "PTE-Situational" },
  { value: "pte_writing", label: "PTE-Writing" },
  { value: "pte_fill_in_blanks", label: "PTE-Fill in the Blanks" },
  { value: "pte_mcq_multiple", label: "PTE-MCQ (Multiple Choice)" },
  { value: "pte_reorder", label: "PTE-Reorder" },
  { value: "pte_fill_drag", label: "PTE-Fill and Drag" },
  { value: "pte_mcq_single", label: "PTE-MCQ (Single Choice)" },
  { value: "pte_summarize_spoken", label: "PTE-Summarize Spoken" },
  { value: "pte_mcq_multiple_listening", label: "PTE-MCQ (Multiple Choice) listening" },
  { value: "pte_fill_listening", label: "PTE-Fill listening" },
  { value: "pte_highlight", label: "PTE-Highlight" },
  { value: "pte_mcq_single_listening", label: "PTE-MCQ (Single Choice) listening" },
  { value: "pte_summarize_listening", label: "PTE-Summarize listening" },
  { value: "pte_writing_listening", label: "PTE-Writing listening" },
]


const optionSchema = new Schema({
  label: String,      // "A", "B", "C" (optional)
  text: String,       // option text
  isCorrect: Boolean, // supports multiple correct answers
});

const dataInsightsSchema = new Schema(
  {
    subtype: {
      type: String,
      enum: [
        "multi_source_reasoning",
        "two_part_analysis",
        "table_analysis",
        "graphics_interpretation",
      ],
      required: true,
    },
    multiSource: {
      tabs: [
        {
          id: String,
          title: String,
          contentHtml: String,
        },
      ],
      statements: [
        {
          id: String,
          text: String,         // "Tony and Rahul"
          yesLabel: { type: String, default: "Yes" },
          noLabel: { type: String, default: "No" },
          correct: {
            type: String,
            enum: ["yes", "no"], // correct column
          },
        },
      ],
    },
    twoPart: {
      stem: String, // optional extra text
      columns: [
        {
          id: String,    // "first_mixture"
          title: String, // "First mixture"
        },
      ],
      options: [
        {
          id: String,      // "opt_4"
          label: String,   // "4"
        },
      ],
      correctByColumn: {
        type: Map,
        of: String,
      },
    },
    tableAnalysis: {
      table: {
        columns: [String], // ["Statistic", "Don Pizza", "Pizza King"]
        rows: [
          {
            id: String,
            cells: [String], // same length as columns
          },
        ],
      },
      statements: [
        {
          id: String,
          text: String,
          trueLabel: { type: String, default: "True" },
          falseLabel: { type: String, default: "False" },
          correct: { type: String, enum: ["true", "false"] },
        },
      ],
    },
    graphics: {
      prompt: String,
      dropdowns: [
        {
          id: String,        // "blank_region"
          label: String,     // "Select region"
          options: [String], // ["east-central", "northeastern", ...]
          correctIndex: Number,
        },
      ],
    },
  },
  { _id: false }
);


const questionSchema = new Schema(
  {
    exam: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    questionType: {
      type: String,
      required: true,
      enum: [...pteType.map(item => item.value),
        "gmat_quant_problem_solving",
        "gmat_quant_data_sufficiency",
        "gmat_verbal_sc",
        "gmat_verbal_cr",
        "gmat_verbal_rc",
        "gmat_data_insights",
        "gre_analytical_writing",
        "gre_verbal_text_completion",
        "gre_verbal_sentence_equivalence",
        "gre_verbal_reading_comp",
        "gre_verbal_reading_multi",
        "gre_quantitative",
        "gre_quantitative_multi",
        "gre_quantitative_value",
        "sat_reading_writing",
        "sat_math_calculator",
        "sat_math_no_calculator",
        "sat_value",
        "summarize_group_discussions",
        "essay",
        "other",
      ],
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    tags: [String],
    stimulus: String,
    questionText: {
      type: String,
      required: true,
    },
    typeSpecific: Schema.Types.Mixed,
    options: [optionSchema],
    correctAnswerText: String,
    dataInsights: dataInsightsSchema,
    marks: { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },
    explanation: String,
    source: String,
  },
  { timestamps: true }
);

questionSchema.index({
  exam: 1,
  section: 1,
  questionType: 1,
});

export const Question = model("McuQuestion", questionSchema);
