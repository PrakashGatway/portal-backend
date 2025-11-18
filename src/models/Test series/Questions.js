import { Schema, model } from 'mongoose';

const questionTypes = [
  'form_completion', 'note_completion', 'table_completion', 'flow_chart_completion',
  'summary_completion', 'sentence_completion', 'short_answer', 'map_labelling',
  'plan_labelling', 'diagram_labelling', 'matching_headings', 'matching_information',
  'matching_features', 'true_false_not_given', 'yes_no_not_given',
  'matching_sentence_endings', 'classification_reading', 'multiple_choice_single',
  'multiple_choice_multiple', 'writing_task_1_academic', 'writing_task_1_general',
  'writing_task_2', 'speaking_part_1', 'speaking_part_2', 'speaking_part_3',
  'true_false', 'fill_in_blank', 'essay', 'matching', 'drag_and_drop',
  'audio_response', 'image_based', 'pick_from_a_list'
];

const QuestionOptionSchema = new Schema({
  label: String,
  text: String,
  isCorrect: Boolean,
  explanation: String,
}, { _id: false });

const SubQuestionSchema = new Schema({
  question: {
    type: String,
    required: true,
  },
  order: {
    type: Number
  },
  options: [QuestionOptionSchema],
  correctAnswer: Schema.Types.Mixed,
  explanation: String,
});

const QuestionGroupSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  instruction: String,
  order: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: questionTypes
  },
  marks: {
    type: Number,
    required: true
  },
  commonOptions: String,
  questions: [SubQuestionSchema],
}, { _id: true });

const QuestionSchema = new Schema({
  title: {
    type: String,
  },
  exam: {
    type: String,
    required: true
  },
  sectionId: {
    type: Schema.Types.ObjectId,
    ref: 'Section',
    required: true,
  },
  questionCategory: {
    type: String,
  },
  marks: {
    type: Number,
    default: 1,
  },
  isQuestionGroup: {
    type: Boolean,
    default: false
  },
  questionGroup: [QuestionGroupSchema],
  totalQuestions: Number,
  questionType: {
    type: String,
    enum: questionTypes,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  content: {
    instruction: {
      type: String,
      required: true,
      trim: true,
    },
    passageTitle: String,
    passageText: String,
    transcript: String,
    imageUrl: String,
    audioUrl: String,
    videoUrl: String,
  },
  cueCard: {
    topic: String,
    prompts: [String],
  },
  options: [QuestionOptionSchema],
  correctAnswer: Schema.Types.Mixed,
  explanation: String,
  tags: [String],
  timeLimit: Number,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

QuestionSchema.index({ sectionId: 1, order: 1 });
QuestionSchema.index({ exam: 1, questionCategory: 1, isActive: 1 });

export const Question = model('Question', QuestionSchema);