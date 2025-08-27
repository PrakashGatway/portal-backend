const mongoose = require('mongoose');

const recordedClassSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a class title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: [true, 'Please select a course']
  },
  module: {
    type: mongoose.Schema.ObjectId,
    ref: 'Module'
  },
  instructor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Please assign an instructor']
  },
  order: {
    type: Number,
    required: [true, 'Please add class order']
  },
  video: {
    url: {
      type: String,
      required: [true, 'Please add video URL']
    },
    publicId: String,
    duration: {
      type: Number, // in seconds
      required: [true, 'Please add video duration']
    },
    quality: [{
      resolution: String, // 480p, 720p, 1080p
      url: String,
      size: Number // in MB
    }],
    thumbnail: {
      url: String,
      timestamps: [String] // Array of thumbnail URLs at different timestamps
    },
    captions: [{
      language: String,
      url: String
    }]
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
  quiz: {
    questions: [{
      question: String,
      options: [String],
      correctAnswer: Number,
      explanation: String,
      timestamp: Number // Video timestamp where this question appears
    }],
    passingScore: {
      type: Number,
      default: 70
    }
  },
  notes: {
    isEnabled: {
      type: Boolean,
      default: true
    },
    studentNotes: [{
      student: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      timestamp: Number,
      note: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    instructorNotes: [{
      timestamp: Number,
      note: String,
      isPublic: {
        type: Boolean,
        default: false
      }
    }]
  },
  settings: {
    allowDownload: {
      type: Boolean,
      default: false
    },
    allowSpeedControl: {
      type: Boolean,
      default: true
    },
    allowSkip: {
      type: Boolean,
      default: true
    },
    trackProgress: {
      type: Boolean,
      default: true
    },
    requireCompletion: {
      type: Boolean,
      default: false
    }
  },
  access: {
    type: {
      type: String,
      enum: ['free', 'premium', 'course-specific'],
      default: 'premium'
    },
    courses: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Course'
    }],
    availableFrom: Date,
    availableUntil: Date
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    averageWatchTime: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'processing', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted duration
recordedClassSchema.virtual('formattedDuration').get(function () {
  if (!this.video.duration) return '0:00';

  const minutes = Math.floor(this.video.duration / 60);
  const seconds = this.video.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for watch progress
recordedClassSchema.virtual('watchProgress', {
  ref: 'Progress',
  localField: '_id',
  foreignField: 'content',
  justOne: true,
  match: { contentType: 'RecordedClass' }
});

// Set published date when status changes to published
recordedClassSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('RecordedClass', recordedClassSchema);