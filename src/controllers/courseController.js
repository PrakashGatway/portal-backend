import Course from '../models/Course.js';
import User from '../models/User.js';
import Lesson from '../models/Lesson.js';

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
export const getCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const { 
      category, 
      level, 
      search, 
      instructor,
      pricing,
      featured,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Build filter
    const filter = { status: 'published' };
    
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (instructor) filter.instructor = instructor;
    if (pricing) filter['pricing.type'] = pricing;
    if (featured !== undefined) filter.featured = featured === 'true';
    
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort
    const sort = {};
    if (search) {
      sort.score = { $meta: 'textScore' };
    }
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const courses = await Course.find(filter)
      .populate('instructor', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-reviews -syllabus');

    const total = await Course.countDocuments(filter);

    res.json({
      success: true,
      data: {
        courses,
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

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
export const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name avatar profile.bio')
      .populate('coInstructors', 'name avatar')
      .populate({
        path: 'syllabus.lessons',
        select: 'title duration type isPreview'
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled (if authenticated)
    let isEnrolled = false;
    if (req.user) {
      const user = await User.findById(req.user.id);
      isEnrolled = user.courses.some(c => c.course.toString() === req.params.id);
    }

    res.json({
      success: true,
      data: {
        ...course.toObject(),
        isEnrolled
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private/Teacher
export const createCourse = async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      instructor: req.user.id
    };

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Teacher/Admin
export const updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check ownership
    if (course.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Teacher/Admin
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check ownership
    if (course.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    await Course.findByIdAndDelete(req.params.id);
    
    // Also delete associated lessons
    await Lesson.deleteMany({ course: req.params.id });

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add review to course
// @route   POST /api/courses/:id/reviews
// @access  Private
export const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled
    const user = await User.findById(req.user.id);
    const isEnrolled = user.courses.some(c => c.course.toString() === req.params.id);
    
    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Must be enrolled to review'
      });
    }

    // Check if user already reviewed
    const existingReview = course.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment;
    } else {
      // Add new review
      course.reviews.push({
        user: req.user.id,
        rating,
        comment
      });
    }

    // Recalculate average rating
    course.calculateAverageRating();

    await course.save();

    res.json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get course lessons
// @route   GET /api/courses/:id/lessons
// @access  Private (enrolled users only)
export const getCourseLessons = async (req, res) => {
  try {
    // Check if user is enrolled or is the instructor
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const user = await User.findById(req.user.id);
    const isEnrolled = user.courses.some(c => c.course.toString() === req.params.id);
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isEnrolled && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Must be enrolled to access lessons'
      });
    }

    const lessons = await Lesson.find({ course: req.params.id })
      .sort({ order: 1 })
      .select(isEnrolled || isInstructor || isAdmin ? '' : 'title description type duration isPreview');

    res.json({
      success: true,
      data: lessons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};