import Notification from "../models/Notification.js";
import User from "../models/User.js";


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

    // Single user notification
    if (!isGlobal && !recipient) {
      return res.status(400).json({
        success: false,
        message: "Recipient is required for single-user notification.",
      });
    }

    // Check recipient exists
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
      Category,
      Courses,
        priority,
        data,
        channels,
        scheduledFor,
      });

      return res.status(201).json({
        success: true,
        message: "Global notification created successfully.",
        data: notification,
      });
    }

    // -----------------------------
    // SINGLE USER NOTIFICATION
    // -----------------------------
    const notification = await Notification.create({
      recipient,
      isGlobal: false,
      sender,
      title,
      message,
      type,
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

    const {
      page = 1,
      limit = 20,
      status,
      type,
      isActive,
      category,
      course,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const orConditions = [];

    // User notifications
    orConditions.push({
      recipient: userId,
      isGlobal: false,
    });

    // Global notifications
    orConditions.push({
      isGlobal: true,
    });

    // Status
    if (status) {
      orConditions.push({
        status,
      });
    }

    // Type
    if (type) {
      orConditions.push({
        type,
      });
    }

    // Category
    if (category) {
      orConditions.push({
        Category: category,
      });
    }

    // Course
    if (course) {
      orConditions.push({
        Courses: course,
      });
    }

    // Active Date
    if (isActive) {
      const start = new Date(isActive);
      start.setHours(0, 0, 0, 0);

      const end = new Date(isActive);
      end.setHours(23, 59, 59, 999);

      orConditions.push({
        from: { $lte: end },
        to: { $gte: start },
      });
    }
    
    // const query = {
    //   $or: orConditions,
    // };


    const query1 = {
  $and: [
    {
      $or: [
        { recipient: userId, isGlobal: false },
        { isGlobal: true },
      ],
    },
  ],
};

// isActive is REQUIRED
if (isActive) {
  const start = new Date(isActive);
  start.setHours(0, 0, 0, 0);

  const end = new Date(isActive);
  end.setHours(23, 59, 59, 999);

  query1.$and.push({
    from: { $lte: end },
    to: { $gte: start },
  });
}

const optionalFilters = [];

if (category) optionalFilters.push({ Category: category });
if (course) optionalFilters.push({ Courses: course });
if (status) optionalFilters.push({ status });
if (type) optionalFilters.push({ type });

// If any optional filters are provided, at least one must match
if (optionalFilters.length > 0) {
  query1.$and.push({
    $or: optionalFilters,
  });
}

    console.log(query1, "notification ")
    const [notifications, total] = await Promise.all([
      Notification.find(query1)
        .populate("sender", "name email profileImage")
        .populate("data.courseId", "name title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      Notification.countDocuments(query1),
    ]);

    return res.status(200).json({
      success: true,
      total,
      count: notifications.length,
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
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



// export const getMyNotifications = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const {
//       page = 1,
//       limit = 20,
//       status,
//       type,
//       isActive,
//       category,
//       course
//     } = req.query;

//     const skip = (Number(page) - 1) * Number(limit);

    
//     const query = {
//       $or: [
//         {
//           recipient: userId,
//           isGlobal: false,
//         },
//         {
//           isGlobal: true,
//         },
//       ],
//     };

    
//     if (status) {
//       query.status = status;
//     }

//     if (category) {
//       query.Category = category;
//     }

//     if (course) {
//       query.Courses = course;
//     }

//     if (isActive) {
//       const selectedDate = new Date(isActive);

//       if (!isNaN(selectedDate.getTime())) {
//         query.from = { $lte: selectedDate };
//         query.to = { $gte: selectedDate };
//       }
//     }

//     if (type) {
//       query.type = type;
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
//   } catch (error) {
//     console.error(" Error: ", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch notifications.",
//       error: error.message,
//     });
//   }
// };

export const getNotifications = async (req, res) => {
    try {
        
    const {
      page = 1,
      limit = 20,
      status
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    //get all notification
    const query = {};

    if (status) {
      query.status = status;
    }

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
            success : false,
            message : "Failed to fetch notifications.",
            error: error.message
        })
    }
}


export const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Notification.countDocuments({
      status: "unread",
      $or: [
        {
          recipient: userId,
          isGlobal: false,
        },
        {
          isGlobal: true,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      count,
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
      $or: [
        {
          recipient: userId,
          isGlobal: false,
        },
        {
          isGlobal: true,
        },
      ],
    });

    console.log(notification,'notification ', userId, id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    notification.status = "read";
    notification.readAt = new Date();

    await notification.save();

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

    await Notification.updateMany(
      {
        status: "unread",
        $or: [
          {
            recipient: userId,
            isGlobal: false,
          },
          {
            isGlobal: true,
          },
        ],
      },
      {
        $set: {
          status: "read",
          readAt: new Date(),
        },
      }
    );

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
      $or: [
        {
          recipient: userId,
          isGlobal: false,
        },
        {
          isGlobal: true,
        },
      ],
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    notification.status = "archived";

    await notification.save();

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

    const notification = await Notification.findOne({
      _id: id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    await Notification.findByIdAndDelete(id);

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