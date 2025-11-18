// models/MiniQuestion.js
import { Schema, model } from 'mongoose';

const MiniQuestionSchema = new Schema({
  // Reference to the original Question document (parent)
  originalQuestionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },

  // The question type (e.g., 'multiple_choice_multiple', 'summary_completion')
  questionType: {
    type: String,
    enum: [
      'form_completion', 'note_completion', 'table_completion', 'flow_chart_completion',
      'summary_completion', 'sentence_completion', 'short_answer', 'map_labelling',
      'plan_labelling', 'diagram_labelling', 'matching_headings', 'matching_information',
      'matching_features', 'true_false_not_given', 'yes_no_not_given',
      'matching_sentence_endings', 'classification_reading', 'multiple_choice_single',
      'multiple_choice_multiple', 'writing_task_1_academic', 'writing_task_1_general',
      'writing_task_2', 'speaking_part_1', 'speaking_part_2', 'speaking_part_3',
      'true_false', 'fill_in_blank', 'essay', 'matching', 'drag_and_drop',
      'audio_response', 'image_based', 'pick_from_a_list'
    ],
    required: true
  },

  questionText: {
    type: String,
    required: true
  },

  // Options — flattened from sub-question.options
  options: [{
    label: String,
    text: String,
    isCorrect: Boolean,
    explanation: String
  }],

  // Correct answer — flattened from sub-question.correctAnswer
  correctAnswer: Schema.Types.Mixed,

  // Explanation — flattened
  explanation: String,

  // Marks — inherited from parent questionGroup or question
  marks: {
    type: Number,
    default: 1
  },

  // Order within the original group (for context)
  groupOrder: Number,
  subQuestionIndex: Number, // position within questionGroup.questions array

  // Metadata from parent
  exam: String,
  sectionId: Schema.Types.ObjectId,
  questionCategory: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },

  // For tracking if this mini-question is part of a test series
  isInTestSeries: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for fast lookup
MiniQuestionSchema.index({ questionType: 1, exam: 1, isActive: 1 });
MiniQuestionSchema.index({ exam: 1, questionCategory: 1, questionType: 1 });
MiniQuestionSchema.index({ originalQuestionId: 1, groupOrder: 1, subQuestionIndex: 1 });

export const MiniQuestion = model('MiniQuestion', MiniQuestionSchema);