// models/Test series/UserTestAttempts.js
import { Schema, model } from 'mongoose';

const UserResponseSchema = new Schema({
  questionGroupId: {
    type: Schema.Types.ObjectId,
  },
  subQuestionId: {
    type: Schema.Types.ObjectId,
  },
  answer: Schema.Types.Mixed,
  timeSpent: {
    type: Number,
    default: 0
  },
  isCorrect: Boolean,
  marksObtained: {
    type: String
  },
  evaluation: Schema.Types.Mixed
}, { _id: true });

const UserSessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  testSeriesId: {
    type: Schema.Types.ObjectId,
    ref: 'TestSeries',
    required: true,
  },
  currentSectionIndex: {
    type: Number,
    default: 0,
  },
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  lastQuestionIndex: {
    type: Number,
    default: 0,
  },
  responses: [{
    sectionType: String,
    sectionId: Schema.Types.ObjectId,
    questionId: Schema.Types.ObjectId,
    totalScore:String,
    questions: [UserResponseSchema]
  }],
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: Date,
  isCompleted: {
    type: Boolean,
    default: false,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  duration: Number,
  sectionScores: [{
    sectionId: Schema.Types.ObjectId,
    score: Number,
    totalMarks: Number
  }]
}, {
  timestamps: true,
});

UserSessionSchema.index({ userId: 1, testSeriesId: 1, isCompleted: 1 });
UserSessionSchema.index({ startTime: 1 });

export const UserSession = model('UserSession', UserSessionSchema);