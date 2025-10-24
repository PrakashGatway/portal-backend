import { Schema, model } from 'mongoose';

const QuestionSchema = new Schema(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
    },
    sectionPart: {
      type: Number,
      min: 1,
    },
    questionNumber: {
      type: Number,
    },
    order: {
      type: Number,
      required: true,
    },
    marks: {
      type: Number,
      default: 1,
    },
    questionType: {
      type: String,
      required: true,
      enum: [
        'form_completion',
        'note_completion',
        'table_completion',
        'flow_chart_completion',
        'summary_completion',
        'sentence_completion',
        'short_answer',
        'map_labelling',
        'plan_labelling',
        'diagram_labelling',
        'matching_headings',
        'matching_information',
        'matching_features',
        'true_false_not_given',   // Academic Reading
        'yes_no_not_given',       // General Training Reading
        'multiple_choice_single',
        'multiple_choice_multiple',
        'writing_task_1_academic',
        'writing_task_1_general',
        'writing_task_2',
        'speaking_part_1',
        'speaking_part_2',
        'speaking_part_3',
        'true_false',
        'fill_in_blank',          // generic fallback
        'essay',
        'matching',
        'drag_and_drop',
        'audio_response',
        'image_based',
      ],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    content: {
      instruction: {
        type: String, // e.g., "Complete the form. Write ONE WORD ONLY."
        required: true,
        trim: true,
      },
      passageText: String,    // Reading passage
      transcript: String,     // Listening script (for admin/reference)
      imageUrl: String,       // maps, diagrams, charts
      audioUrl: String,       // Listening audio
      videoUrl: String,
    },
    cueCard: {
      topic: String,
      prompts: [String], // e.g., ["Who was with you?", "Why was it memorable?"]
    },
    options: [
      {
        label: String,        // "A", "i", "1" — useful for headings
        text: String,
        isCorrect: Boolean,
        explanation: String,
      },
    ],
    correctAnswer: Schema.Types.Mixed,
    sampleAnswer: {
      text: String,
      wordCount: Number,
      bandScore: Number, // or generic "score"
    },
    explanation: String,
    tags: [String], // e.g., ["ielts", "academic", "map", "environment"]
    timeLimit: Number, // seconds (e.g., 1200 for Writing Task 1)
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

QuestionSchema.index({ examId: 1, section: 1, sectionPart: 1, questionNumber: 1 });
QuestionSchema.index({ examId: 1, order: 1 });

export const Question = model('Question', QuestionSchema);