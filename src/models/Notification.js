import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.isGlobal;
      },
    },

    isGlobal: {
      type: Boolean,
      default: false,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    from: {
      type: String,
      required: false,
    },
    to: {
      type: String,
      required: false,
    },
    Category: {
      type: String,
      required: false,
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    Courses: {
      type: String,
      required: false,

      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },

    type: {
      type: String,
      enum: [
        "course_enrollment",
        "lesson_completion",
        "test_assigned",
        "test_graded",
        "live_class_reminder",
        "live_class_started",
        "assignment_due",
        "certificate_earned",
        "announcement",
        "message",
        "payment",
        "system",
      ],
      required: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    data: {
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },

      lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },

      testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Test",
      },

      classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },

      url: String,
      actionText: String,
    },

    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },

      email: {
        type: Boolean,
        default: false,
      },

      push: {
        type: Boolean,
        default: false,
      },

      sms: {
        type: Boolean,
        default: false,
      },
    },

    status: {
      type: String,
      enum: ["unread", "read", "archived"],
      default: "unread",
    },

    readAt: {
      type: Date,
    },

    scheduledFor: {
      type: Date,
    },

    sentAt: {
      type: Date,
    },

    deliveryStatus: {
      email: {
        sent: {
          type: Boolean,
          default: false,
        },
        deliveredAt: Date,
        error: String,
      },

      push: {
        sent: {
          type: Boolean,
          default: false,
        },
        deliveredAt: Date,
        error: String,
      },

      sms: {
        sent: {
          type: Boolean,
          default: false,
        },
        deliveredAt: Date,
        error: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Single-user notifications
notificationSchema.index({
  recipient: 1,
  status: 1,
});

notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

// Global notifications
notificationSchema.index({
  isGlobal: 1,
  createdAt: -1,
});

notificationSchema.index({
  type: 1,
});

notificationSchema.index({
  scheduledFor: 1,
});

export default mongoose.model("Notification", notificationSchema);







// import mongoose from 'mongoose';

// const notificationSchema = new mongoose.Schema({
//   recipient: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   sender: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   title: {
//     type: String,
//     required: true
//   },
//   message: {
//     type: String,
//     required: true
//   },
//   type: {
//     type: String,
//     enum: [
//       'course_enrollment',
//       'lesson_completion',
//       'test_assigned',
//       'test_graded',
//       'live_class_reminder',
//       'live_class_started',
//       'assignment_due',
//       'certificate_earned',
//       'announcement',
//       'message',
//       'payment',
//       'system'
//     ],
//     required: true
//   },
//   priority: {
//     type: String,
//     enum: ['low', 'medium', 'high', 'urgent'],
//     default: 'medium'
//   },
//   data: {
//     courseId: mongoose.Schema.Types.ObjectId,
//     lessonId: mongoose.Schema.Types.ObjectId,
//     testId: mongoose.Schema.Types.ObjectId,
//     classId: mongoose.Schema.Types.ObjectId,
//     url: String,
//     actionText: String
//   },
//   channels: {
//     inApp: {
//       type: Boolean,
//       default: true
//     },
//     email: {
//       type: Boolean,
//       default: false
//     },
//     push: {
//       type: Boolean,
//       default: false
//     },
//     sms: {
//       type: Boolean,
//       default: false
//     }
//   },
//   status: {
//     type: String,
//     enum: ['unread', 'read', 'archived'],
//     default: 'unread'
//   },
//   readAt: Date,
//   scheduledFor: Date, // For scheduled notifications
//   sentAt: Date,
//   deliveryStatus: {
//     email: {
//       sent: Boolean,
//       deliveredAt: Date,
//       error: String
//     },
//     push: {
//       sent: Boolean,
//       deliveredAt: Date,
//       error: String
//     },
//     sms: {
//       sent: Boolean,
//       deliveredAt: Date,
//       error: String
//     }
//   }
// }, {
//   timestamps: true
// });

// // Indexes
// notificationSchema.index({ recipient: 1, status: 1 });
// notificationSchema.index({ recipient: 1, createdAt: -1 });
// notificationSchema.index({ type: 1 });
// notificationSchema.index({ scheduledFor: 1 });

// export default mongoose.model('Notification', notificationSchema);