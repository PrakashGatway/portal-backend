import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'course_enrollment',
      'lesson_completion',
      'test_assigned',
      'test_graded',
      'live_class_reminder',
      'live_class_started',
      'assignment_due',
      'certificate_earned',
      'announcement',
      'message',
      'payment',
      'system'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  data: {
    courseId: mongoose.Schema.Types.ObjectId,
    lessonId: mongoose.Schema.Types.ObjectId,
    testId: mongoose.Schema.Types.ObjectId,
    classId: mongoose.Schema.Types.ObjectId,
    url: String,
    actionText: String
  },
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  readAt: Date,
  scheduledFor: Date, // For scheduled notifications
  sentAt: Date,
  deliveryStatus: {
    email: {
      sent: Boolean,
      deliveredAt: Date,
      error: String
    },
    push: {
      sent: Boolean,
      deliveredAt: Date,
      error: String
    },
    sms: {
      sent: Boolean,
      deliveredAt: Date,
      error: String
    }
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ scheduledFor: 1 });

export default mongoose.model('Notification', notificationSchema);