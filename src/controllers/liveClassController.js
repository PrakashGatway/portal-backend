import LiveClass from '../models/LiveClass.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// @desc    Get all live classes
// @route   GET /api/classes
// @access  Private
export const getLiveClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { course, status, instructor, upcoming } = req.query;

    // Build filter
    const filter = {};
    if (course) filter.course = course;
    if (status) filter.status = status;
    if (instructor) filter.instructor = instructor;
    
    if (upcoming === 'true') {
      filter.scheduledStart = { $gte: new Date() };
    }

    // Students can only see classes from their enrolled courses
    if (req.user.role === 'student') {
      const user = await User.findById(req.user.id);
      const enrolledCourses = user.courses.map(c => c.course);
      filter.course = { $in: enrolledCourses };
    }

    const classes = await LiveClass.find(filter)
      .populate('course', 'title')
      .populate('instructor', 'name avatar')
      .sort({ scheduledStart: 1 })
      .skip(skip)
      .limit(limit);

    const total = await LiveClass.countDocuments(filter);

    res.json({
      success: true,
      data: {
        classes,
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

// @desc    Get single live class
// @route   GET /api/classes/:id
// @access  Private
export const getLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id)
      .populate('course', 'title')
      .populate('instructor', 'name avatar')
      .populate('participants.user', 'name avatar');

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check if user can access this class
    if (req.user.role === 'student') {
      const user = await User.findById(req.user.id);
      const isEnrolled = user.courses.some(c => c.course.toString() === liveClass.course._id.toString());
      
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'Not enrolled in this course'
        });
      }
    }

    // Check if user is already a participant
    const isParticipant = liveClass.participants.some(
      p => p.user._id.toString() === req.user.id
    );

    res.json({
      success: true,
      data: {
        ...liveClass.toObject(),
        isParticipant
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create live class
// @route   POST /api/classes
// @access  Private/Teacher
export const createLiveClass = async (req, res) => {
  try {
    const classData = {
      ...req.body,
      instructor: req.user.id
    };

    const liveClass = await LiveClass.create(classData);

    // Notify enrolled students
    if (liveClass.course) {
      const enrolledUsers = await User.find({
        'courses.course': liveClass.course
      });

      const notifications = enrolledUsers.map(user => ({
        recipient: user._id,
        sender: req.user.id,
        title: 'New Live Class Scheduled',
        message: `A new live class "${liveClass.title}" has been scheduled`,
        type: 'live_class_reminder',
        data: {
          classId: liveClass._id,
          courseId: liveClass.course,
          scheduledStart: liveClass.scheduledStart
        },
        scheduledFor: new Date(liveClass.scheduledStart.getTime() - 15 * 60 * 1000) // 15 minutes before
      }));

      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      message: 'Live class created successfully',
      data: liveClass
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update live class
// @route   PUT /api/classes/:id
// @access  Private/Teacher
export const updateLiveClass = async (req, res) => {
  try {
    let liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check ownership
    if (liveClass.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this class'
      });
    }

    liveClass = await LiveClass.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Live class updated successfully',
      data: liveClass
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete live class
// @route   DELETE /api/classes/:id
// @access  Private/Teacher
export const deleteLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check ownership
    if (liveClass.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this class'
      });
    }

    await LiveClass.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Live class deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Join live class
// @route   POST /api/classes/:id/join
// @access  Private
export const joinClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check if user is enrolled in the course
    const user = await User.findById(req.user.id);
    const isEnrolled = user.courses.some(c => c.course.toString() === liveClass.course.toString());
    const isInstructor = liveClass.instructor.toString() === req.user.id;
    
    if (!isEnrolled && !isInstructor) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Check if class is live or about to start
    const now = new Date();
    const classStart = new Date(liveClass.scheduledStart);
    const timeDiff = classStart.getTime() - now.getTime();
    
    if (timeDiff > 15 * 60 * 1000) { // More than 15 minutes early
      return res.status(400).json({
        success: false,
        message: 'Class has not started yet'
      });
    }

    // Check if already joined
    const existingParticipant = liveClass.participants.find(
      p => p.user.toString() === req.user.id
    );

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Already joined this class'
      });
    }

    // Check participant limit
    if (liveClass.participants.length >= liveClass.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Class is full'
      });
    }

    // Add participant
    liveClass.participants.push({
      user: req.user.id,
      joinedAt: new Date(),
      attendance: 'present'
    });

    await liveClass.save();

    // Emit to class room
    if (req.io) {
      req.io.to(`class_${liveClass._id}`).emit('user_joined', {
        userId: req.user.id,
        username: user.name,
        avatar: user.avatar
      });
    }

    res.json({
      success: true,
      message: 'Joined class successfully',
      data: {
        meetingUrl: liveClass.meetingUrl,
        meetingId: liveClass.meetingId,
        meetingPassword: liveClass.meetingPassword
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Leave live class
// @route   POST /api/classes/:id/leave
// @access  Private
export const leaveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    const participant = liveClass.participants.find(
      p => p.user.toString() === req.user.id
    );

    if (!participant) {
      return res.status(400).json({
        success: false,
        message: 'Not a participant in this class'
      });
    }

    participant.leftAt = new Date();
    await liveClass.save();

    // Emit to class room
    if (req.io) {
      req.io.to(`class_${liveClass._id}`).emit('user_left', {
        userId: req.user.id
      });
    }

    res.json({
      success: true,
      message: 'Left class successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Start live class
// @route   POST /api/classes/:id/start
// @access  Private/Teacher
export const startClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check ownership
    if (liveClass.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this class'
      });
    }

    liveClass.status = 'live';
    liveClass.actualStart = new Date();
    await liveClass.save();

    // Notify all enrolled students
    const enrolledUsers = await User.find({
      'courses.course': liveClass.course
    });

    const notifications = enrolledUsers.map(user => ({
      recipient: user._id,
      sender: req.user.id,
      title: 'Live Class Started',
      message: `Live class "${liveClass.title}" has started`,
      type: 'live_class_started',
      data: {
        classId: liveClass._id,
        courseId: liveClass.course
      }
    }));

    await Notification.insertMany(notifications);

    // Send real-time notifications
    if (req.io) {
      enrolledUsers.forEach(user => {
        req.io.to(`user_${user._id}`).emit('notification', {
          type: 'live_class_started',
          title: 'Live Class Started',
          message: `Live class "${liveClass.title}" has started`,
          data: { classId: liveClass._id }
        });
      });
    }

    res.json({
      success: true,
      message: 'Class started successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    End live class
// @route   POST /api/classes/:id/end
// @access  Private/Teacher
export const endClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check ownership
    if (liveClass.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to end this class'
      });
    }

    liveClass.status = 'ended';
    liveClass.actualEnd = new Date();

    // Mark participants who didn't leave as present
    liveClass.participants.forEach(participant => {
      if (!participant.leftAt) {
        participant.leftAt = new Date();
      }
    });

    await liveClass.save();

    // Emit to class room
    if (req.io) {
      req.io.to(`class_${liveClass._id}`).emit('class_ended', {
        message: 'Class has ended'
      });
    }

    res.json({
      success: true,
      message: 'Class ended successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};