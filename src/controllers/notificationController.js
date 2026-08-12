


import { Notification, NotificationRec } from "../models/Notification.js";
import User from "../models/User.js";
import mongoose from "mongoose";

export const createNotification = async (req, res) => {
  try {
    const {
      recipient,
      isGlobal = false,
      sender,
      title,
      message,
      type,
      from,
      to,
      Category,
      Courses,
      priority,
      data,
      channels,
      scheduledFor,
    } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: "Title, message and type are required.",
      });
    }

    if (!isGlobal && !recipient) {
      return res.status(400).json({
        success: false,
        message: "Recipient is required for single-user notification.",
      });
    }

    if (!isGlobal && recipient) {
      const userExists = await User.findById(recipient);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: "Recipient user not found.",
        });
      }
    }

    if (isGlobal === true) {
      const notification = await Notification.create({
        recipient: undefined,
        isGlobal: true,
        sender,
        title,
        message,
        type,
        from,
        to,
        Category: Category || undefined,
        Courses: Courses || undefined,
        priority,
        data,
        channels,
        scheduledFor,
      });

      // No NotificationRec created here on purpose — per-user records for a
      // global notification are created lazily (on first read/archive/delete)
      // in the handlers below, not up front for every user.

      return res.status(201).json({
        success: true,
        message: "Global notification created successfully.",
        data: notification,
      });
    }

    const notification = await Notification.create({
      recipient,
      isGlobal: false,
      sender,
      title,
      message,
      type,
      from,
      to,
      Category: Category || undefined,
      Courses: Courses || undefined,
      priority,
      data,
      channels,
      scheduledFor,
    });

    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      data: notification,
    });
  } catch (error) {
    console.error("Create Notification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create notification.",
      error: error.message,
    });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const { page = 1, limit = 20, isActive, category, course, status, type } = req.query;

    if (!isActive) {
      return res.status(400).json({ success: false, message: "isActive is required." });
    }

    const selectedDate = new Date(isActive);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid isActive date." });
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 20, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const selectedDateString = `${year}-${month}-${day}`;

    // Per-user records the user has deleted or archived — used to exclude
    // those global notifications from the result set below.
    const hiddenRecs = await NotificationRec.find({
      user: userId,
      $or: [{ isDeleted: true }, { isArchived: true }],
    })
      .select("notification isDeleted isArchived")
      .lean();

    const deletedIds = hiddenRecs.filter((r) => r.isDeleted).map((r) => r.notification);
    const archivedIds = hiddenRecs.filter((r) => r.isArchived).map((r) => r.notification);

    const query = {
      $and: [
        {
          $or: [
            { isGlobal: true },
            { isGlobal: false, recipient: userId },
          ],
        },
        {
          from: { $lte: selectedDateString },
          to: { $gte: selectedDateString },
        },
        // never show notifications this user deleted (global or personal)
        { _id: { $nin: deletedIds } },
      ],
    };

    // Hide globals this user archived, unless they explicitly asked for archived
    if (status !== "archived" && archivedIds.length > 0) {
      query.$and.push({ _id: { $nin: archivedIds } });
    }

    console.log(category,'category')

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        console.log(category,'category')
        return res.status(400).json({ success: false, message: "Invalid category ID." });
      }
      query.$and.push({ Category: new mongoose.Types.ObjectId(category) });
    }

    // if (course) {
    //   if (!mongoose.Types.ObjectId.isValid(course)) {
    //     return res.status(400).json({ success: false, message: "Invalid course ID." });
    //   }
    //   query.$and.push({ Courses: new mongoose.Types.ObjectId(course) });
    // }


    // status/type filters only make sense reliably for personal notifications
    // here (global read/archived state lives in NotificationRec, merged below)
    if (status && status !== "archived") {
      query.$and.push({
        $or: [
          { isGlobal: false, status },
          { isGlobal: true },
        ],
      });
    }

    if (type) {
      query.$and.push({ type });
    }

    console.log('query',query)

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate("sender", "name email profileImage")
        .populate("Category")
        .populate("Courses")
        .populate("data.courseId", "name title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Notification.countDocuments(query),
    ]);

    // Merge in this user's personal read/archive state for global notifications
    const readRecs = await NotificationRec.find({
      user: userId,
      notification: { $in: notifications.map((n) => n._id) },
    })
      .select("notification isRead readAt isArchived archivedAt")
      .lean();

    const recByNotifId = new Map(readRecs.map((r) => [String(r.notification), r]));

    const merged = notifications.map((n) => {
      if (!n.isGlobal) return n;
      const rec = recByNotifId.get(String(n._id));
      return {
        ...n,
        status: rec?.isArchived ? "archived" : rec?.isRead ? "read" : "unread",
        readAt: rec?.readAt || null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",
      data: merged,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Notification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
      error: error.message,
    });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};
    if (status) query.status = status;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate("sender", "name email profileImage")
        .populate("data.courseId", "name title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
      error: error.message,
    });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user._id;

    // personal unread
    const personalUnread = await Notification.countDocuments({
      recipient: userId,
      isGlobal: false,
      status: "unread",
    });

    // global notifications visible to everyone, minus ones this user
    // already has a NotificationRec marking read/archived/deleted for
    const globalIds = await Notification.find({ isGlobal: true }).distinct("_id");

    const seenRecs = await NotificationRec.find({
      user: userId,
      notification: { $in: globalIds },
      $or: [{ isRead: true }, { isArchived: true }, { isDeleted: true }],
    }).distinct("notification");

    const globalUnread = globalIds.length - seenRecs.length;

    return res.status(200).json({
      success: true,
      count: personalUnread + globalUnread,
    });
  } catch (error) {
    console.error("Unread Count Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get unread notification count.",
      error: error.message,
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      $or: [{ recipient: userId, isGlobal: false }, { isGlobal: true }],
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    if (notification.isGlobal) {
      // per-user record, shared doc untouched
      await NotificationRec.findOneAndUpdate(
        { notification: id, user: userId },
        { $set: { isRead: true, readAt: new Date() } },
        { upsert: true, new: true }
      );
    } else {
      notification.status = "read";
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
      error: error.message,
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    // personal notifications: update directly
    await Notification.updateMany(
      { recipient: userId, isGlobal: false, status: "unread" },
      { $set: { status: "read", readAt: new Date() } }
    );

    // global notifications: upsert a NotificationRec per unseen global
    const globalIds = await Notification.find({ isGlobal: true }).distinct("_id");
    const existingRecs = await NotificationRec.find({
      user: userId,
      notification: { $in: globalIds },
    }).distinct("notification");

    const existingSet = new Set(existingRecs.map(String));
    const toInsert = globalIds
      .filter((gid) => !existingSet.has(String(gid)))
      .map((gid) => ({
        notification: gid,
        user: userId,
        isRead: true,
        readAt: new Date(),
      }));

    const ops = [];
    if (toInsert.length > 0) {
      ops.push(NotificationRec.insertMany(toInsert, { ordered: false }));
    }
    if (existingRecs.length > 0) {
      ops.push(
        NotificationRec.updateMany(
          { user: userId, notification: { $in: existingRecs }, isRead: false },
          { $set: { isRead: true, readAt: new Date() } }
        )
      );
    }
    await Promise.all(ops);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("Mark All Notifications Read Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
      error: error.message,
    });
  }
};

export const archiveNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      $or: [{ recipient: userId, isGlobal: false }, { isGlobal: true }],
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    if (notification.isGlobal) {
      await NotificationRec.findOneAndUpdate(
        { notification: id, user: userId },
        { $set: { isArchived: true, archivedAt: new Date() } },
        { upsert: true, new: true }
      );
    } else {
      notification.status = "archived";
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: "Notification archived successfully.",
    });
  } catch (error) {
    console.error("Archive Notification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to archive notification.",
      error: error.message,
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ _id: id });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    if (notification.isGlobal) {
      
      await NotificationRec.findOneAndUpdate(
        { notification: id, user: userId },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { upsert: true, new: true }
      );
    } else {
      // Personal notification belongs to exactly one recipient — safe to
      // hard-delete, but only if the requester actually owns it.
      if (String(notification.recipient) !== String(userId) && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to delete this notification.",
        });
      }
      await Notification.findByIdAndDelete(id);
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
      error: error.message,
    });
  }
};























// import Notification from "../models/Notification.js";
// import User from "../models/User.js";
// import mongoose from "mongoose";


// export const createNotification = async (req, res) => {
//   try {
//     const {
//       recipient,
//       isGlobal = false,
//       sender,
//       title,
//       message,
//       type,
//       from,
//       to,
//       Category,
//       Courses,
//       priority,
//       data,
//       channels,
//       scheduledFor,
//     } = req.body;

    
//     if (!title || !message || !type) {
//       return res.status(400).json({
//         success: false,
//         message: "Title, message and type are required.",
//       });
//     }

//     // Single user notification
//     if (!isGlobal && !recipient) {
//       return res.status(400).json({
//         success: false,
//         message: "Recipient is required for single-user notification.",
//       });
//     }

//     // Check recipient exists
//     if (!isGlobal && recipient) {
//       const userExists = await User.findById(recipient);

//       if (!userExists) {
//         return res.status(404).json({
//           success: false,
//           message: "Recipient user not found.",
//         });
//       }
//     }

    
//     if (isGlobal === true) {
//       const notification = await Notification.create({
//         recipient: undefined,
//         isGlobal: true,
//         sender,
//         title,
//         message,
//         type,
//       from,
//       to,
//       Category,
//       Courses,
//         priority,
//         data,
//         channels,
//         scheduledFor,
//       });

//       return res.status(201).json({
//         success: true,
//         message: "Global notification created successfully.",
//         data: notification,
//       });
//     }

//     // -----------------------------
//     // SINGLE USER NOTIFICATION
//     // -----------------------------
//     const notification = await Notification.create({
//       recipient,
//       isGlobal: false,
//       sender,
//       title,
//       message,
//       type,
//       priority,
//       data,
//       channels,
//       scheduledFor,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Notification created successfully.",
//       data: notification,
//     });
//   } catch (error) {
//     console.error("Create Notification Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to create notification.",
//       error: error.message,
//     });
//   }
// };



// export const getMyNotifications = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const {
//       page = 1,
//       limit = 20,
//       isActive,
//       category,
//       course,
//       status,
//       type,
//     } = req.query;

//     if (!isActive) {
//       return res.status(400).json({
//         success: false,
//         message: "isActive is required.",
//       });
//     }

//     const selectedDate = new Date(isActive);

//     if (isNaN(selectedDate.getTime())) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid isActive date.",
//       });
//     }

//     const pageNumber = Math.max(Number(page) || 1, 1);
//     const limitNumber = Math.max(Number(limit) || 20, 1);
//     const skip = (pageNumber - 1) * limitNumber;

//     const year = selectedDate.getFullYear();
//     const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
//     const day = String(selectedDate.getDate()).padStart(2, "0");

//     const selectedDateString = `${year}-${month}-${day}`;

//     const optionalConditions = [];

//     if (category) {
//       if (!mongoose.Types.ObjectId.isValid(category)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid category ID.",
//         });
//       }

//       optionalConditions.push({
//         Category: new mongoose.Types.ObjectId(category),
//       });
//     }

//     if (course) {
//       if (!mongoose.Types.ObjectId.isValid(course)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid course ID.",
//         });
//       }

//       optionalConditions.push({
//         Courses: new mongoose.Types.ObjectId(course),
//       });
//     }

//     if (status) {
//       optionalConditions.push({
//         status,
//       });
//     }

//     if (type) {
//       optionalConditions.push({
//         type,
//       });
//     }

//     const query = {
//       $and: [
//         {
//           $or: [
//             {
//               isGlobal: true,
//             },
//             {
//               isGlobal: false,
//               recipient: userId,
//             },
//           ],
//         },
//         {
//           from: {
//             $lte: selectedDateString,
//           },
//           to: {
//             $gte: selectedDateString,
//           },
//         },
//       ],
//     };

//     if (optionalConditions.length > 0) {
//       query.$and.push({
//         $or: optionalConditions,
//       });
//     }

//     const [notifications, total] = await Promise.all([
//       Notification.find(query)
//         .populate("sender", "name email profileImage")
//         .populate("Category")
//         .populate("Courses")
//         .populate("data.courseId", "name title")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNumber)
//         .lean(),

//       Notification.countDocuments(query),
//     ]);

//     return res.status(200).json({
//       success: true,
//       message: "Notifications fetched successfully.",
//       data: notifications,
//       pagination: {
//         total,
//         page: pageNumber,
//         limit: limitNumber,
//         totalPages: Math.ceil(total / limitNumber),
//       },
//     });
//   } catch (error) {
//     console.error("Notification Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch notifications.",
//       error: error.message,
//     });
//   }
// };

// // export const getMyNotifications = async (req, res) => {
// //   try {
// //     const userId = req.user._id;

// //     const {
// //       page = 1,
// //       limit = 20,
// //       status,
// //       type,
// //       isActive,
// //       category,
// //       course,
// //     } = req.query;

// //     const pageNumber = Math.max(Number(page) || 1, 1);
// //     const limitNumber = Math.max(Number(limit) || 20, 1);
// //     const skip = (pageNumber - 1) * limitNumber;


// //     if (!isActive) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "isActive is required.",
// //       });
// //     }


// //     const selectedDate = new Date(isActive);

// //     if (isNaN(selectedDate.getTime())) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Invalid isActive date.",
// //       });
// //     }


// //     const year = selectedDate.getFullYear();
// //     const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
// //     const day = String(selectedDate.getDate()).padStart(2, "0");

// //     const selectedDateString = `${year}-${month}-${day}`;


// //     const audienceCondition = {
// //       $or: [
// //         {
// //           isGlobal: true,
// //         },
// //         {
// //           recipient: userId,
// //           isGlobal: false,
// //         },
// //       ],
// //     };


// //     const activeCondition = {
// //       $or: [
// //         {
// //           from: {
// //             $lte: selectedDateString,
// //           },
// //           to: {
// //             $gte: selectedDateString,
// //           },
// //         },
// //         {
// //           to: {
// //             $lte: selectedDateString,
// //           },
// //           from: {
// //             $gte: selectedDateString,
// //           },
// //         },
// //       ],
// //     };


// //     const optionalConditions = [];


// //     if (category) {

// //       optionalConditions.push({
// //         Category: new mongoose.Types.ObjectId(category),
// //       });
// //     }


// //     if (course) {
// //       if (!mongoose.Types.ObjectId.isValid(course)) {
// //         return res.status(400).json({
// //           success: false,
// //           message: "Invalid course ID.",
// //         });
// //       }

// //       optionalConditions.push({
// //         Courses: new mongoose.Types.ObjectId(course),
// //       });
// //     }


// //     if (status) {
// //       optionalConditions.push({
// //         status: status,
// //       });
// //     }


// //     if (type) {
// //       optionalConditions.push({
// //         type: type,
// //       });
// //     }


// //     const query = {
// //       $and: [
// //         audienceCondition,
// //         activeCondition,
// //       ],
// //     };

    
// //     if (optionalConditions.length > 0) {
// //       query.$and.push({
// //         $or: optionalConditions,
// //       });
// //     }


// //     console.log("======================================");
// //     console.log("USER ID:", userId);
// //     console.log("isActive:", isActive);
// //     console.log("selectedDateString:", selectedDateString);
// //     console.log("category:", category);
// //     console.log("course:", course);
// //     console.log("status:", status);
// //     console.log("type:", type);

// //     console.log(
// //       "FINAL NOTIFICATION QUERY:",
// //       JSON.stringify(query, null, 2)
// //     );

// //     console.log("======================================");


// //     const [notifications, total] = await Promise.all([
// //       Notification.find(query)
// //         .populate("sender", "name email profileImage")
// //         .populate("data.courseId", "name title")
// //         .sort({ createdAt: -1 })
// //         .skip(skip)
// //         .limit(limitNumber)
// //         .lean(),

// //       Notification.countDocuments(query),
// //     ]);

    

// //     return res.status(200).json({
// //       success: true,
// //       message: "Notifications fetched successfully.",
// //       data: notifications,
// //       pagination: {
// //         total,
// //         page: pageNumber,
// //         limit: limitNumber,
// //         totalPages: Math.ceil(total / limitNumber),
// //       },
// //     });

// //   } catch (error) {
// //     console.error("Notification Error:", error);

// //     return res.status(500).json({
// //       success: false,
// //       message: "Failed to fetch notifications.",
// //       error: error.message,
// //     });
// //   }
// // };



// // export const getMyNotifications = async (req, res) => {
// //   try {
// //     const userId = req.user._id;

// //     const {
// //       page = 1,
// //       limit = 20,
// //       status,
// //       type,
// //       isActive,
// //       category,
// //       course
// //     } = req.query;

// //     const skip = (Number(page) - 1) * Number(limit);

    
// //     const query = {
// //       $or: [
// //         {
// //           recipient: userId,
// //           isGlobal: false,
// //         },
// //         {
// //           isGlobal: true,
// //         },
// //       ],
// //     };

    
// //     if (status) {
// //       query.status = status;
// //     }

// //     if (category) {
// //       query.Category = category;
// //     }

// //     if (course) {
// //       query.Courses = course;
// //     }

// //     if (isActive) {
// //       const selectedDate = new Date(isActive);

// //       if (!isNaN(selectedDate.getTime())) {
// //         query.from = { $lte: selectedDate };
// //         query.to = { $gte: selectedDate };
// //       }
// //     }

// //     if (type) {
// //       query.type = type;
// //     }

// //     const [notifications, total] = await Promise.all([
// //       Notification.find(query)
// //         .populate("sender", "name email profileImage")
// //         .populate("data.courseId", "name title")
// //         .sort({ createdAt: -1 })
// //         .skip(skip)
// //         .limit(Number(limit)),

// //       Notification.countDocuments(query),
// //     ]);

// //     return res.status(200).json({
// //       success: true,
// //       data: notifications,
// //       pagination: {
// //         total,
// //         page: Number(page),
// //         limit: Number(limit),
// //         totalPages: Math.ceil(total / Number(limit)),
// //       },
// //     });
// //   } catch (error) {
// //     console.error(" Error: ", error);

// //     return res.status(500).json({
// //       success: false,
// //       message: "Failed to fetch notifications.",
// //       error: error.message,
// //     });
// //   }
// // };

// export const getNotifications = async (req, res) => {
//     try {
        
//     const {
//       page = 1,
//       limit = 20,
//       status
//     } = req.query;

//     const skip = (Number(page) - 1) * Number(limit);

//     //get all notification
//     const query = {};

//     if (status) {
//       query.status = status;
//     }

//     const [notifications, total] = await Promise.all([
//       Notification.find(query)
//         .populate("sender", "name email profileImage")
//         .populate("data.courseId", "name title")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(Number(limit)),

//       Notification.countDocuments(query),
//     ]);

//     return res.status(200).json({
//       success: true,
//       data: notifications,
//       pagination: {
//         total,
//         page: Number(page),
//         limit: Number(limit),
//         totalPages: Math.ceil(total / Number(limit)),
//       },
//     });
  
//     } catch (error) {
//         console.error("Error: ", error);
//         return res.status(500).json({
//             success : false,
//             message : "Failed to fetch notifications.",
//             error: error.message
//         })
//     }
// }


// export const getUnreadNotificationCount = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const count = await Notification.countDocuments({
//       status: "unread",
//       $or: [
//         {
//           recipient: userId,
//           isGlobal: false,
//         },
//         {
//           isGlobal: true,
//         },
//       ],
//     });

//     return res.status(200).json({
//       success: true,
//       count,
//     });
//   } catch (error) {
//     console.error("Unread Count Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to get unread notification count.",
//       error: error.message,
//     });
//   }
// };


// export const markNotificationAsRead = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user._id;

//     const notification = await Notification.findOne({
//       _id: id,
//       $or: [
//         {
//           recipient: userId,
//           isGlobal: false,
//         },
//         {
//           isGlobal: true,
//         },
//       ],
//     });

//     console.log(notification,'notification ', userId, id);
//     if (!notification) {
//       return res.status(404).json({
//         success: false,
//         message: "Notification not found.",
//       });
//     }

//     notification.status = "read";
//     notification.readAt = new Date();

//     await notification.save();

//     return res.status(200).json({
//       success: true,
//       message: "Notification marked as read.",
//       data: notification,
//     });
//   } catch (error) {
//     console.error("Mark Notification Read Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to mark notification as read.",
//       error: error.message,
//     });
//   }
// };


// export const markAllNotificationsAsRead = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     await Notification.updateMany(
//       {
//         status: "unread",
//         $or: [
//           {
//             recipient: userId,
//             isGlobal: false,
//           },
//           {
//             isGlobal: true,
//           },
//         ],
//       },
//       {
//         $set: {
//           status: "read",
//           readAt: new Date(),
//         },
//       }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "All notifications marked as read.",
//     });
//   } catch (error) {
//     console.error("Mark All Notifications Read Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to mark all notifications as read.",
//       error: error.message,
//     });
//   }
// };


// export const archiveNotification = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user._id;

//     const notification = await Notification.findOne({
//       _id: id,
//       $or: [
//         {
//           recipient: userId,
//           isGlobal: false,
//         },
//         {
//           isGlobal: true,
//         },
//       ],
//     });

//     if (!notification) {
//       return res.status(404).json({
//         success: false,
//         message: "Notification not found.",
//       });
//     }

//     notification.status = "archived";

//     await notification.save();

//     return res.status(200).json({
//       success: true,
//       message: "Notification archived successfully.",
//     });
//   } catch (error) {
//     console.error("Archive Notification Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to archive notification.",
//       error: error.message,
//     });
//   }
// };


// export const deleteNotification = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user._id;

//     const notification = await Notification.findOne({
//       _id: id
//     });

//     if (!notification) {
//       return res.status(404).json({
//         success: false,
//         message: "Notification not found.",
//       });
//     }

//     await Notification.findByIdAndDelete(id);

//     return res.status(200).json({
//       success: true,
//       message: "Notification deleted successfully.",
//     });
//   } catch (error) {
//     console.error("Delete Notification Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to delete notification.",
//       error: error.message,
//     });
//   }
// };