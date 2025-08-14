import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// @desc    Get all lessons
// @route   GET /api/lessons
// @access  Private
export const getLessons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { course, type, status } = req.query;

    // Build filter
    const filter = {};
    if (course) filter.course = course;
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Students can only see published lessons from enrolled courses
    if (req.user.role === 'student') {
      const user = await User.findById(req.user.id);
      const enrolledCourses = user.courses.map(c => c.course);
      filter.course = { $in: enrolledCourses };
      filter.status = 'published';
    }

    const lessons = await Lesson.find(filter)
      .populate('course', 'title')
      .sort({ course: 1, order: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Lesson.countDocuments(filter);

    res.json({
      success: true,
      data: {
        lessons,
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

// @desc    Get single lesson
// @route   GET /api/lessons/:id
// @access  Private
export const getLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('course', 'title instructor')
      .populate('interactions.user', 'name avatar');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if user can access this lesson
    if (req.user.role === 'student') {
      const user = await User.findById(req.user.id);
      const isEnrolled = user.courses.some(c => c.course.toString() === lesson.course._id.toString());
      
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'Not enrolled in this course'
        });
      }

      // Check if lesson is published or is a preview
      if (lesson.status !== 'published' && !lesson.isPreview) {
        return res.status(403).json({
          success: false,
          message: 'Lesson not available'
        });
      }
    }

    // Check if user has completed this lesson
    const hasCompleted = lesson.completions.some(
      c => c.user.toString() === req.user.id
    );

    // Get user's interactions with this lesson
    const userInteractions = lesson.interactions.filter(
      i => i.user._id.toString() === req.user.id
    );

    res.json({
      success: true,
      data: {
        ...lesson.toObject(),
        hasCompleted,
        userInteractions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create lesson
// @route   POST /api/lessons
// @access  Private/Teacher
export const createLesson = async (req, res) => {
  try {
    const lesson = await Lesson.create(req.body);

    // Update course lesson count
    await Course.findByIdAndUpdate(lesson.course, {
      $inc: { lessonsCount: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private/Teacher
export const updateLesson = async (req, res) => {
  try {
    let lesson = await Lesson.findById(req.params.id).populate('course');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check ownership
    if (lesson.course.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lesson'
      });
    }

    lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      data: lesson
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private/Teacher
export const deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('course');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check ownership
    if (lesson.course.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this lesson'
      });
    }

    await Lesson.findByIdAndDelete(req.params.id);

    // Update course lesson count
    await Course.findByIdAndUpdate(lesson.course._id, {
      $inc: { lessonsCount: -1 }
    });

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark lesson as completed
// @route   POST /api/lessons/:id/complete
// @access  Private/Student
export const completeLesson = async (req, res) => {
  try {
    const { timeSpent, watchTime } = req.body;
    
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if user is enrolled in the course
    const user = await User.findById(req.user.id);
    const courseEnrollment = user.courses.find(c => c.course.toString() === lesson.course.toString());
    
    if (!courseEnrollment) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Check if already completed
    const existingCompletion = lesson.completions.find(
      c => c.user.toString() === req.user.id
    );

    if (existingCompletion) {
      return res.status(400).json({
        success: false,
        message: 'Lesson already completed'
      });
    }

    // Mark as completed
    lesson.completions.push({
      user: req.user.id,
      completedAt: new Date(),
      timeSpent: timeSpent || 0,
      watchTime: watchTime || 0
    });

    await lesson.save();

    // Update user's completed lessons
    if (!courseEnrollment.completedLessons.includes(lesson._id)) {
      courseEnrollment.completedLessons.push(lesson._id);
      
      // Calculate progress
      const course = await Course.findById(lesson.course);
      const totalLessons = await Lesson.countDocuments({ 
        course: lesson.course, 
        status: 'published' 
      });
      
      courseEnrollment.progress = Math.round(
        (courseEnrollment.completedLessons.length / totalLessons) * 100
      );

      await user.save();

      // Send notification for course completion
      if (courseEnrollment.progress >= 100) {
        await Notification.create({
          recipient: req.user.id,
          title: 'Course Completed!',
          message: `Congratulations! You have completed "${course.title}"`,
          type: 'lesson_completion',
          data: {
            courseId: course._id,
            courseName: course.title
          }
        });

        // Send real-time notification
        if (req.io) {
          req.io.to(`user_${req.user.id}`).emit('notification', {
            type: 'lesson_completion',
            title: 'Course Completed!',
            message: `Congratulations! You have completed "${course.title}"`,
            data: { courseId: course._id }
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Lesson marked as completed',
      data: {
        progress: courseEnrollment.progress,
        completedLessons: courseEnrollment.completedLessons.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add interaction to lesson
// @route   POST /api/lessons/:id/interact
// @access  Private
export const addInteraction = async (req, res) => {
  try {
    const { type, content, timestamp } = req.body;
    
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if user is enrolled in the course
    const user = await User.findById(req.user.id);
    const isEnrolled = user.courses.some(c => c.course.toString() === lesson.course.toString());
    
    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Add interaction
    lesson.interactions.push({
      user: req.user.id,
      type,
      content,
      timestamp,
      createdAt: new Date()
    });

    await lesson.save();

    res.json({
      success: true,
      message: 'Interaction added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};