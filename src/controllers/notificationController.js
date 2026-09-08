import mongoose from "mongoose";
import { Notification, NotificationRec } from "../models/Notification.js";
import User from "../models/User.js";
import {
  sendPushToUsers,
  sendPushToTopic,
} from "../services/pushNotitification.js";

import { fcmToken } from "../models/fcmToken.js";

const VALID_TYPES = [
  "course",
  "offer",
  "reminder",
  "announcement",
  "payment",
  "system",
];

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

export const saveToken = async (req, res) => {
  try {
    const { token, id } = req.body;

    if (!token || !id) {
      return res.status(400).json({
        success: false,
        message: "token and id are required",
      });
    }

    // Validate MongoDB user ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Find user and save FCM token
    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          token: token,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("_id name email role token");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FCM token saved successfully",
      data: {
        userId: user._id,
        token: user.token,
      },
    });
  } catch (error) {
    console.error("Error saving FCM token:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// export const saveToken = async (req, res) => {
//   try {
//     const { token, id } = req.body;

//     if (!token || !id) {
//       return res.status(400).json({ message: "token and id are required" });
//     }

//     await fcmToken.findOneAndUpdate(
//       { token, user: id },
//       { token, user: id },
//       { upsert: true }
//     );

//     return res.status(200).json({ message: "Token saved" });
//   } catch (error) {
//     console.error("Error saving token:", error);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// };

export const createNotification = async (req, res) => {
  try {
    const {
      recipient,
      recipients = [],
      isGlobal = false,

      notificationKey,
      title,
      message,
      from,
      to,
      Category,

      type,
      priority = "medium",
      isActive = true,

      data = {},
      proceedStatus = false,
      scheduledFor = null,
      metaInfo = {},

      sendPush = false,
    } = req.body;

    const sender = req.user?._id;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid notification type. Allowed: ${VALID_TYPES.join(
          ", ",
        )}`,
      });
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority.",
      });
    }

    let userIds = [];

    if (recipient) {
      userIds.push(recipient);
    }

    if (Array.isArray(recipients)) {
      userIds.push(...recipients);
    }

    userIds = [...new Set(userIds.filter(Boolean).map((id) => String(id)))];

    /* Validate ObjectIds */

    for (const id of userIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid user ID: ${id}`,
        });
      }
    }

    if (!isGlobal && userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "recipient or recipients is required for personal notification.",
      });
    }

    const notification = await Notification.create({
      isGlobal: Boolean(isGlobal),

      notificationKey: notificationKey || undefined,

      sender,

      title: title.trim(),
      message: message.trim(),

      from: from || undefined,
      to: to || undefined,

      Category: Category || undefined,

      type,
      priority,

      isActive: Boolean(isActive),

      data: {
        courseId: data.courseId || undefined,
        contentId: data.contentId || undefined,
        testId: data.testId || undefined,
        url: data.url || undefined,
        actionText: data.actionText || undefined,
      },

      proceedStatus: Boolean(proceedStatus),

      scheduledFor: scheduledFor || null,

      metaInfo,
    });

    if (!isGlobal) {
      console.log("all user ids", userIds);

      const recipientDocs = userIds.map((userId) => ({
        notification: notification._id,
        user: userId,
        isRead: false,
        readAt: null,
      }));

      await NotificationRec.insertMany(recipientDocs, {
        ordered: false,
      });
    }

    let pushResult = null;

    if (sendPush) {
      const pushData = {
        notificationId: String(notification._id),
        notificationKey: notificationKey || "",
        type,
        priority,
        url: data.url || "",
        actionText: data.actionText || "",
      };

      if (isGlobal) {
        pushResult = await sendPushToTopic("global_notifications", {
          title,
          body: message,
          data: pushData,
        });
      } else {
        pushResult = await sendPushToUsers(userIds, {
          title,
          body: message,
          data: pushData,
        });

        /* Save push result in NotificationRec */

        for (const userId of userIds) {
          const result = pushResult.get(String(userId));

          if (!result) continue;

          await NotificationRec.findOneAndUpdate(
            {
              notification: notification._id,
              user: userId,
            },
            {
              $set: {
                "meta.push": result.status === "sent" ? "sent" : result.status,
              },
            },
            {
              new: true,
            },
          );
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: isGlobal
        ? "Global notification created successfully."
        : "Notification created successfully.",

      data: {
        notification,
        recipients: userIds,
        pushResult,
      },
    });
  } catch (error) {
    console.error("createNotification error:", error);

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

    const { page = 1, limit = 20, type, isRead, isActive = "true" } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    /* ---------------- USER RECIPIENT RECORDS ---------------- */

    const recipientRecords = await NotificationRec.find({
      user: userId,
    })
      .select("notification isRead readAt expiresAt meta")
      .lean();

    const personalNotificationIds = recipientRecords.map(
      (rec) => rec.notification,
    );

    const recipientMap = new Map();

    recipientRecords.forEach((rec) => {
      recipientMap.set(String(rec.notification), rec);
    });

    /* ---------------- QUERY ---------------- */

    const query = {
      $or: [
        {
          _id: {
            $in: personalNotificationIds,
          },
          isGlobal: false,
        },
        {
          isGlobal: true,
        },
      ],
    };

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification type.",
        });
      }

      query.type = type;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    /* ---------------- GET NOTIFICATIONS ---------------- */

    const notifications = await Notification.find(query)
      .populate("sender", "name email")
      .populate("Category", "name")
      .populate("data.courseId")
      .populate("data.contentId")
      .populate("data.testId")
      .sort({ createdAt: -1 })
      .lean();

    /* ---------------- FORMAT ---------------- */

    let data = notifications.map((notification) => {
      const rec = recipientMap.get(String(notification._id));

      return {
        ...notification,

        isRead: rec?.isRead || false,

        readAt: rec?.readAt || null,

        meta: rec?.meta || {
          email: "",
          push: "",
          sms: "",
        },

        notificationScope: notification.isGlobal ? "global" : "personal",
      };
    });

    data = data.filter((notification) => {
      const rec = recipientMap.get(String(notification._id));

      if (!rec?.expiresAt) {
        return true;
      }

      return new Date(rec.expiresAt) > new Date();
    });

    if (isRead !== undefined) {
      const readValue = isRead === "true";

      data = data.filter((notification) => notification.isRead === readValue);
    }

    const total = data.length;

    const skip = (pageNumber - 1) * limitNumber;

    data = data.slice(skip, skip + limitNumber);

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",

      data,

      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("getMyNotifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
      error: error.message,
    });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isGlobal,
      isActive,
      notificationKey,
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const query = {};

    if (type) {
      query.type = type;
    }

    if (isGlobal !== undefined) {
      query.isGlobal = isGlobal === "true";
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    if (notificationKey) {
      query.notificationKey = notificationKey;
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate("sender", "name email")
        .populate("Category", "name")
        .populate("data.courseId")
        .populate("data.contentId")
        .populate("data.testId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",

      data: notifications,

      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("getNotifications error:", error);

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
    const now = new Date();

    // Personal unread notifications
    const personalUnread = await NotificationRec.countDocuments({
      user: userId,
      isRead: false,

      // Notification should either:
      // 1. Have no expiry date
      // 2. Have an expiry date in the future
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    });

    // Get all active global notifications
    const globalNotifications = await Notification.find({
      isGlobal: true,
      isActive: true,

      // Only non-expired global notifications
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    })
      .select("_id")
      .lean();

    const globalIds = globalNotifications.map((item) => item._id);

    // If there are no global notifications,
    // avoid unnecessary database query
    if (globalIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          personalUnread,
          globalUnread: 0,
          totalUnread: personalUnread,
        },
      });
    }

    // Find global notifications already read by this user
    const readGlobal = await NotificationRec.find({
      user: userId,
      notification: {
        $in: globalIds,
      },
      isRead: true,
    })
      .select("notification")
      .lean();

    const readGlobalIds = new Set(
      readGlobal.map((item) => String(item.notification)),
    );

    // Count global notifications not read by this user
    const unreadGlobal = globalIds.filter(
      (id) => !readGlobalIds.has(String(id)),
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        personalUnread,
        globalUnread: unreadGlobal,
        totalUnread: personalUnread + unreadGlobal,
      },
    });
  } catch (error) {
    console.error("getUnreadNotificationCount error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get unread notification count.",
      error: error.message,
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      isActive: true,
      $or: [
        {
          isGlobal: true,
        },
        {
          isGlobal: false,
        },
      ],
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    /* For personal notification verify ownership */

    if (!notification.isGlobal) {
      const recipient = await NotificationRec.findOne({
        notification: notificationId,
        user: userId,
      });

      if (!recipient) {
        return res.status(403).json({
          success: false,
          message: "You are not a recipient of this notification.",
        });
      }
    }

    const record = await NotificationRec.findOneAndUpdate(
      {
        notification: notificationId,
        user: userId,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: record,
    });
  } catch (error) {
    console.error("markNotificationAsRead error:", error);

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

    /* Personal notifications */

    const personalNotifications = await NotificationRec.find({
      user: userId,
    }).select("notification");

    const personalIds = personalNotifications.map((item) => item.notification);

    const globalNotifications = await Notification.find({
      isGlobal: true,
      isActive: true,
    }).select("_id");

    const globalIds = globalNotifications.map((item) => item._id);

    const allIds = [...personalIds, ...globalIds];

    if (!allIds.length) {
      return res.status(200).json({
        success: true,
        message: "No notifications found.",
      });
    }

    await NotificationRec.bulkWrite(
      allIds.map((notificationId) => ({
        updateOne: {
          filter: {
            notification: notificationId,
            user: userId,
          },
          update: {
            $set: {
              isRead: true,
              readAt: new Date(),
            },
          },
          upsert: true,
        },
      })),
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
      error: error.message,
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    /* Personal notification */

    if (!notification.isGlobal) {
      const recipient = await NotificationRec.findOne({
        notification: notificationId,
        user: userId,
      });

      if (!recipient) {
        return res.status(403).json({
          success: false,
          message: "You cannot delete this notification.",
        });
      }
    }

    await NotificationRec.findOneAndUpdate(
      {
        notification: notificationId,
        user: userId,
      },
      {
        $set: {
          expiresAt: new Date(),
        },
      },
      {
        upsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Notification deleted for you.",
    });
  } catch (error) {
    console.error("deleteNotification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
      error: error.message,
    });
  }
};

export const deleteNotificationForEveryone = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    await NotificationRec.deleteMany({
      notification: notificationId,
    });

    await Notification.findByIdAndDelete(notificationId);

    return res.status(200).json({
      success: true,
      message: "Notification deleted for everyone.",
    });
  } catch (error) {
    console.error("deleteNotificationForEveryone error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification for everyone.",
      error: error.message,
    });
  }
};

export const testSendPush = async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "userIds (array), title, and body are required",
      });
    }

    const results = await sendPushToUsers(userIds, { title, body, data });

    return res.status(200).json({
      success: true,
      results: Object.fromEntries(results),
    });
  } catch (error) {
    console.error("testSendPush error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send push",
      error: error.message,
    });
  }
};
