// question.model.ts
import { Schema, model } from "mongoose";

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
          id: String,          // "tab1"
          title: String,       // "Decision Criteria"
          contentHtml: String, // passage, rules, etc.
        },
      ],
      statements: [
        {
          id: String,           // "pair_tony_rahul"
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
      enum: [
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
        "gre_quantitative",

        "sat_reading_writing",
        "sat_math_calculator",
        "sat_math_no_calculator",

        "essay",
        "other",
      ],
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },

    tags: [String],         // topics: "algebra", "probability", "rc-science", etc.

    stimulus: String,       // passage, graph, scenario (optional)
    questionText: {
      type: String,
      required: true,
    },

    options: [optionSchema],   // MCQ options (optional for essay/numeric)
    correctAnswerText: String, // numeric or text answer (for non-MCQ types)
    dataInsights: dataInsightsSchema,
    marks: { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },

    explanation: String,
    source: String,        // "Official Guide", "Custom", etc.
  },
  { timestamps: true }
);

questionSchema.index({
  exam: 1,
  section: 1,
  questionType: 1,
});

export const Question = model("McuQuestion", questionSchema);
