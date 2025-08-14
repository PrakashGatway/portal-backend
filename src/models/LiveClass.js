import mongoose from 'mongoose';

const liveClassSchema = new mongoose.Schema({
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
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  meetingId: String, // For third-party meeting services
  meetingUrl: String,
  meetingPassword: String,
  maxParticipants: {
    type: Number,
    default: 100
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: Date,
    leftAt: Date,
    attendance: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present'
    }
  }],
  recording: {
    available: {
      type: Boolean,
      default: false
    },
    url: String,
    publicId: String,
    duration: Number
  },
  chat: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['text', 'emoji', 'file'],
      default: 'text'
    }
  }],
  polls: [{
    question: {
      type: String,
      required: true
    },
    options: [String],
    responses: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      answer: String,
      submittedAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    active: {
      type: Boolean,
      default: true
    }
  }],
  whiteboard: {
    data: mongoose.Schema.Types.Mixed, // Store whiteboard state
    lastUpdated: Date
  },
  settings: {
    allowChat: {
      type: Boolean,
      default: true
    },
    allowScreenShare: {
      type: Boolean,
      default: false
    },
    allowRecording: {
      type: Boolean,
      default: true
    },
    waitingRoom: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes
liveClassSchema.index({ course: 1 });
liveClassSchema.index({ instructor: 1 });
liveClassSchema.index({ scheduledStart: 1 });
liveClassSchema.index({ status: 1 });

export default mongoose.model('LiveClass', liveClassSchema);