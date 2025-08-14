import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  type: {
    type: String,
    enum: ['video', 'text', 'quiz', 'assignment', 'live', 'document'],
    required: true
  },
  content: {
    video: {
      url: String,
      publicId: String,
      duration: Number, // in seconds
      quality: [String], // ['720p', '1080p']
      captions: [{
        language: String,
        url: String
      }]
    },
    text: {
      content: String, // HTML content
      estimatedReadTime: Number // in minutes
    },
    document: {
      url: String,
      publicId: String,
      type: String, // 'pdf', 'doc', 'ppt'
      size: Number
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test'
    },
    assignment: {
      instructions: String,
      submissionFormat: [String], // ['pdf', 'doc', 'video']
      maxScore: Number,
      dueDate: Date
    }
  },
  resources: [{
    title: String,
    type: String, // 'link', 'file', 'code'
    url: String,
    description: String
  }],
  order: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  interactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'bookmark', 'note', 'question']
    },
    content: String,
    timestamp: Number, // for video lessons
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  completions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    timeSpent: Number, // in seconds
    watchTime: Number // in seconds, for video lessons
  }]
}, {
  timestamps: true
});

// Indexes
lessonSchema.index({ course: 1, order: 1 });
lessonSchema.index({ status: 1 });
lessonSchema.index({ type: 1 });

export default mongoose.model('Lesson', lessonSchema);