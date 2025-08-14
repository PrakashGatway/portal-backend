import User from '../models/User.js';
import Course from '../models/Course.js';

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { role, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(filter)
      .select('-password -refreshTokens')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('courses.course', 'title');

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
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

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens')
      .populate('courses.course', 'title thumbnail instructor');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can view this profile (self, admin, or teacher for their students)
    if (req.user.id !== req.params.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this profile'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check authorization
    if (req.user.id !== id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const updateData = { ...req.body };
    
    // Remove sensitive fields
    delete updateData.password;
    delete updateData.refreshTokens;
    delete updateData.resetPasswordToken;
    delete updateData.resetPasswordExpires;

    // Only admins can change roles
    if (updateData.role && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      delete updateData.role;
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Enroll user in course
// @route   POST /api/users/:id/enroll
// @access  Private
export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.params.id;

    // Check authorization
    if (req.user.id !== userId && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId)
    ]);

    if (!user || !course) {
      return res.status(404).json({
        success: false,
        message: 'User or course not found'
      });
    }

    // Check if already enrolled
    const isEnrolled = user.courses.some(c => c.course.toString() === courseId);
    if (isEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Enroll user
    user.courses.push({
      course: courseId,
      enrolledAt: new Date(),
      progress: 0
    });

    // Update course student count
    course.studentsCount += 1;

    await Promise.all([user.save(), course.save()]);

    // Send notification
    if (req.io) {
      req.io.to(`user_${userId}`).emit('notification', {
        type: 'course_enrollment',
        title: 'Course Enrollment',
        message: `Successfully enrolled in ${course.title}`,
        data: { courseId, courseName: course.title }
      });
    }

    res.json({
      success: true,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's enrolled courses
// @route   GET /api/users/:id/courses
// @access  Private
export const getUserCourses = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'courses.course',
        populate: {
          path: 'instructor',
          select: 'name avatar'
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};