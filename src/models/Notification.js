


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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    Courses: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: false,
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
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
      testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
      classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
      url: String,
      actionText: String,
    },

    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },

    // NOTE: this status/readAt is ONLY meaningful for personal (isGlobal: false)
    // notifications, since they belong to a single recipient. For global
    // notifications, per-user read/archive/delete state lives in NotificationRec.
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
      email: { sent: { type: Boolean, default: false }, deliveredAt: Date, error: String },
      push: { sent: { type: Boolean, default: false }, deliveredAt: Date, error: String },
      sms: { sent: { type: Boolean, default: false }, deliveredAt: Date, error: String },
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ isGlobal: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ scheduledFor: 1 });

// -----------------------------------------------------------------------
// NotificationRec — per-user state for GLOBAL notifications.
// A user "deleting" or "reading" a global notification must never mutate
// the shared Notification doc (that would affect every other recipient).
// Instead we upsert a per-user record here.
// -----------------------------------------------------------------------
const notificationRecipientSchema = new mongoose.Schema({
  notification: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Notification",
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    index: true,
    expires: 0, // TTL index - doc auto-removed once expiresAt passes, if set
  },
});

notificationRecipientSchema.index(
  { notification: 1, user: 1 },
  { unique: true }
);

const NotificationRec = mongoose.model("NotificationRec", notificationRecipientSchema);
const Notification = mongoose.model("Notification", notificationSchema);

export { Notification, NotificationRec };

















// import mongoose from "mongoose";

// const notificationSchema = new mongoose.Schema(
//   {

//     recipient: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: function () {
//         return !this.isGlobal;
//       },
//     },

//     isGlobal: {
//       type: Boolean,
//       default: false,
//       index: true,
//     },

//     sender: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },

//     title: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     message: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     from: {
//       type: String,
//       required: false,
//     },
//     to: {
//       type: String,
//       required: false,
//     },
   
//     Category: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       required: false 
//     },
//     Courses: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Course",
//       required: false
//     },

//     type: {
//       type: String,
//       enum: [
//         "course_enrollment",
//         "lesson_completion",
//         "test_assigned",
//         "test_graded",
//         "live_class_reminder",
//         "live_class_started",
//         "assignment_due",
//         "certificate_earned",
//         "announcement",
//         "message",
//         "payment",
//         "system",
//       ],
//       required: true,
//     },

//     priority: {
//       type: String,
//       enum: ["low", "medium", "high", "urgent"],
//       default: "medium",
//     },

//     data: {
//       courseId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Course",
//       },

//       lessonId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Lesson",
//       },

//       testId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Test",
//       },

//       classId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Class",
//       },

//       url: String,
//       actionText: String,
//     },

//     channels: {
//       inApp: {
//         type: Boolean,
//         default: true,
//       },

//       email: {
//         type: Boolean,
//         default: false,
//       },

//       push: {
//         type: Boolean,
//         default: false,
//       },

//       sms: {
//         type: Boolean,
//         default: false,
//       },
//     },

//     status: {
//       type: String,
//       enum: ["unread", "read", "archived"],
//       default: "unread",
//     },

//     readAt: {
//       type: Date,
//     },

//     scheduledFor: {
//       type: Date,
//     },

//     sentAt: {
//       type: Date,
//     },

//     deliveryStatus: {
//       email: {
//         sent: {
//           type: Boolean,
//           default: false,
//         },
//         deliveredAt: Date,
//         error: String,
//       },

//       push: {
//         sent: {
//           type: Boolean,
//           default: false,
//         },
//         deliveredAt: Date,
//         error: String,
//       },

//       sms: {
//         sent: {
//           type: Boolean,
//           default: false,
//         },
//         deliveredAt: Date,
//         error: String,
//       },
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// notificationSchema.index({
//   recipient: 1,
//   status: 1,
// });

// notificationSchema.index({
//   recipient: 1,
//   createdAt: -1,
// });

// notificationSchema.index({
//   isGlobal: 1,
//   createdAt: -1,
// });

// notificationSchema.index({
//   type: 1,
// });

// notificationSchema.index({
//   scheduledFor: 1,
// });



// const notificationRecipientSchema = new mongoose.Schema(
//     {
//         notification: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'Notification',
//             required: true,
//             index: true
//         },
//         user: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'User',
//             required: true,
//             index: true
//         },
//         isRead: {
//             type: Boolean,
//             default: false,
//             index: true
//         },
//         readAt: {
//             type: Date,
//             default: null
//         },
//         expiresAt: {
//             type: Date,
//             index: true,
//             expires: 0
//         }
//     })

// notificationRecipientSchema.index(
//     { notification: 1, user: 1 },
//     { unique: true }
// )

// const NotificationRec = mongoose.model('NotificationRec',notificationRecipientSchema);
// // export NotificationRec;

// const Notification = mongoose.model("Notification", notificationSchema);



// export { Notification, NotificationRec };





