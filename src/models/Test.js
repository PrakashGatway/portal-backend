import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['quiz', 'assignment', 'exam', 'practice'],
    default: 'quiz'
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['multiple-choice', 'true-false', 'short-answer', 'essay', 'code', 'fill-blank'],
      required: true
    },
    options: [String], // For multiple choice
    correctAnswer: mongoose.Schema.Types.Mixed, // Can be string, array, or object
    explanation: String,
    points: {
      type: Number,
      default: 1
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    tags: [String],
    media: {
      type: String,
      enum: ['image', 'video', 'audio'],
      url: String
    }
  }],
  settings: {
    timeLimit: Number, // in minutes
    attempts: {
      type: Number,
      default: 1
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    showResults: {
      type: String,
      enum: ['immediately', 'after-submission', 'after-deadline', 'manual'],
      default: 'after-submission'
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    passingScore: {
      type: Number,
      default: 60
    }
  },
  availability: {
    startDate: Date,
    endDate: Date,
    published: {
      type: Boolean,
      default: false
    }
  },
  submissions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    answers: [{
      questionId: mongoose.Schema.Types.ObjectId,
      answer: mongoose.Schema.Types.Mixed,
      isCorrect: Boolean,
      points: Number,
      timeSpent: Number // in seconds
    }],
    score: Number,
    percentage: Number,
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'graded'],
      default: 'in-progress'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    submittedAt: Date,
    gradedAt: Date,
    feedback: String,
    timeSpent: Number, // total time in seconds
    attempt: {
      type: Number,
      default: 1
    }
  }],
  analytics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    passRate: {
      type: Number,
      default: 0
    },
    questionStats: [{
      questionId: mongoose.Schema.Types.ObjectId,
      correctCount: Number,
      incorrectCount: Number,
      averageTime: Number
    }]
  }
}, {
  timestamps: true
});

// Indexes
testSchema.index({ course: 1 });
testSchema.index({ instructor: 1 });
testSchema.index({ type: 1 });
testSchema.index({ 'availability.published': 1 });

export default mongoose.model('Test', testSchema);