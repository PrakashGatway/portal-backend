import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  thumbnailPic: {
    type: String
  },
  slug: {
    type: String,
    required: [true, 'Please add a slug'],
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Please select a course']
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please assign an instructor']
  },
  order: {
    type: Number,
    default: 0
  },
  access: {
    courses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    availableFrom: Date,
    availableUntil: Date
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft'
  },
  publishedAt: Date,
  isFree: {
    type: Boolean,
    default: false
  },
  tags: [String],
  duration: {
    type: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  discriminatorKey: '__t'
});

contentSchema.index({ course: 1 });
contentSchema.index({ instructor: 1 });
contentSchema.index({ status: 1 });
contentSchema.index({ publishedAt: -1 });
contentSchema.index({ title: 'text', description: 'text' });

contentSchema.virtual('contentType').get(function () {
  return this.__t || 'Content';
});

contentSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

const Content = mongoose.model('Content', contentSchema);

const liveClassSchema = new mongoose.Schema({
  scheduledStart: {
    type: Date,
    required: true
  },
  scheduledEnd: {
    type: Date,
    required: true
  },
  actualStart: Date,
  actualEnd: Date,
  liveStatus: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  meetingId: String,
  meetingUrl: String,
  meetingPassword: String,
});

const recordedClassSchema = new mongoose.Schema({
  video: {
    url: {
      type: String,
    },
    publicId: String,
    duration: {
      type: Number, // in seconds
    }
  },
  content: {
    objectives: [String],
    keyPoints: [String],
    summary: String,
    transcript: String
  },
  materials: [{
    title: String,
    type: {
      type: String,
      enum: ['pdf', 'ppt', 'document', 'link', 'code']
    },
    url: String,
    description: String,
    isDownloadable: {
      type: Boolean,
      default: true
    }
  }],
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    averageWatchTime: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    }
  }
});

const testSchema = new mongoose.Schema({
  testType: {
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
    options: [String],
    correctAnswer: mongoose.Schema.Types.Mixed,
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
    timeLimit: Number,
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
      timeSpent: Number
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
    timeSpent: Number,
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
});

const studyMaterialSchema = new mongoose.Schema({
  materialType: {
    type: String,
    enum: ['pdf', 'document', 'presentation', 'code', 'link', 'image', 'audio'],
    required: true
  },
  file: {
    url: String,
    publicId: String,
    size: Number, // in bytes
    mimeType: String
  },
  content: {
    text: String, // For text-based materials
    pages: Number, // For documents
    downloadCount: {
      type: Number,
      default: 0
    }
  },
  externalLink: String,
  isDownloadable: {
    type: Boolean,
    default: true
  },
  version: {
    type: String,
    default: '1.0'
  },
  relatedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }]
});

const LiveClass = Content.discriminator('LiveClasses', liveClassSchema);
const RecordedClass = Content.discriminator('RecordedClasses', recordedClassSchema);
const Test = Content.discriminator('Tests', testSchema);
const StudyMaterial = Content.discriminator('StudyMaterials', studyMaterialSchema);

export { Content, LiveClass, RecordedClass, Test, StudyMaterial };