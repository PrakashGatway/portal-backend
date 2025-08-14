import Notification from '../models/Notification.js';
import User from '../models/User.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { status, type, priority } = req.query;

    // Build filter
    const filter = { recipient: req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const notifications = await Notification.find(filter)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      status: 'unread'
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.status = 'read';
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, status: 'unread' },
      { 
        status: 'read',
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create notification (admin/teacher only)
// @route   POST /api/notifications
// @access  Private/Teacher/Admin
export const createNotification = async (req, res) => {
  try {
    const { 
      recipients, 
      title, 
      message, 
      type, 
      priority, 
      data, 
      channels,
      scheduledFor 
    } = req.body;

    // Validate recipients
    let recipientIds = [];
    
    if (recipients === 'all') {
      // Send to all users
      const users = await User.find({}, '_id');
      recipientIds = users.map(user => user._id);
    } else if (recipients === 'students') {
      // Send to all students
      const students = await User.find({ role: 'student' }, '_id');
      recipientIds = students.map(user => user._id);
    } else if (recipients === 'teachers') {
      // Send to all teachers
      const teachers = await User.find({ role: 'teacher' }, '_id');
      recipientIds = teachers.map(user => user._id);
    } else if (Array.isArray(recipients)) {
      // Send to specific users
      recipientIds = recipients;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipients format'
      });
    }

    // Create notifications for each recipient
    const notifications = recipientIds.map(recipientId => ({
      recipient: recipientId,
      sender: req.user.id,
      title,
      message,
      type: type || 'announcement',
      priority: priority || 'medium',
      data: data || {},
      channels: channels || { inApp: true },
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    // Send real-time notifications if not scheduled
    if (!scheduledFor && req.io) {
      recipientIds.forEach(recipientId => {
        req.io.to(`user_${recipientId}`).emit('notification', {
          type: type || 'announcement',
          title,
          message,
          data: data || {}
        });
      });
    }

    res.status(201).json({
      success: true,
      message: `Notification sent to ${recipientIds.length} recipients`,
      data: {
        count: createdNotifications.length,
        scheduled: !!scheduledFor
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};