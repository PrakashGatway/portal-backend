import Test from '../models/Test.js';
import User from '../models/User.js';
import Lesson from '../models/Lesson.js';
import Notification from '../models/Notification.js';

// @desc    Get submissions
// @route   GET /api/submissions
// @access  Private
export const getSubmissions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { test, user, status, course } = req.query;

    // Build filter based on user role
    let filter = {};
    
    if (req.user.role === 'student') {
      // Students can only see their own submissions
      filter = { 'submissions.user': req.user.id };
    } else if (req.user.role === 'teacher') {
      // Teachers can see submissions for their tests
      filter = { instructor: req.user.id };
    }

    // Apply additional filters
    if (test) filter._id = test;
    if (user && req.user.role !== 'student') filter['submissions.user'] = user;
    if (status) filter['submissions.status'] = status;
    if (course) filter.course = course;

    const tests = await Test.find(filter)
      .populate('course', 'title')
      .populate('instructor', 'name avatar')
      .populate('submissions.user', 'name email avatar')
      .sort({ 'submissions.submittedAt': -1 })
      .skip(skip)
      .limit(limit);

    // Flatten submissions for easier handling
    let submissions = [];
    tests.forEach(test => {
      test.submissions.forEach(submission => {
        submissions.push({
          _id: submission._id,
          test: {
            _id: test._id,
            title: test.title,
            course: test.course,
            instructor: test.instructor
          },
          user: submission.user,
          score: submission.score,
          percentage: submission.percentage,
          status: submission.status,
          submittedAt: submission.submittedAt,
          gradedAt: submission.gradedAt,
          attempt: submission.attempt,
          timeSpent: submission.timeSpent
        });
      });
    });

    // Filter submissions based on query parameters
    if (req.user.role === 'student') {
      submissions = submissions.filter(s => s.user._id.toString() === req.user.id);
    }

    const total = submissions.length;
    submissions = submissions.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        submissions,
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

// @desc    Get single submission
// @route   GET /api/submissions/:id
// @access  Private
export const getSubmission = async (req, res) => {
  try {
    const test = await Test.findOne({
      'submissions._id': req.params.id
    })
    .populate('course', 'title')
    .populate('instructor', 'name avatar')
    .populate('submissions.user', 'name email avatar');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const submission = test.submissions.id(req.params.id);

    // Check authorization
    const isOwner = submission.user._id.toString() === req.user.id;
    const isInstructor = test.instructor._id.toString() === req.user.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isOwner && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this submission'
      });
    }

    // Prepare response data
    const responseData = {
      _id: submission._id,
      test: {
        _id: test._id,
        title: test.title,
        course: test.course,
        instructor: test.instructor,
        questions: test.questions
      },
      user: submission.user,
      answers: submission.answers,
      score: submission.score,
      percentage: submission.percentage,
      status: submission.status,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      feedback: submission.feedback,
      attempt: submission.attempt,
      timeSpent: submission.timeSpent
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create submission (for assignments)
// @route   POST /api/submissions
// @access  Private/Student
export const createSubmission = async (req, res) => {
  try {
    const { lessonId, content, files } = req.body;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if lesson is an assignment
    if (lesson.type !== 'assignment') {
      return res.status(400).json({
        success: false,
        message: 'This lesson is not an assignment'
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

    // Check if assignment is past due date
    if (lesson.content.assignment.dueDate && new Date() > lesson.content.assignment.dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Assignment submission deadline has passed'
      });
    }

    // Create or update submission
    let existingSubmission = lesson.interactions.find(
      interaction => interaction.user.toString() === req.user.id && interaction.type === 'submission'
    );

    if (existingSubmission) {
      existingSubmission.content = content;
      existingSubmission.createdAt = new Date();
    } else {
      lesson.interactions.push({
        user: req.user.id,
        type: 'submission',
        content: JSON.stringify({ content, files }),
        createdAt: new Date()
      });
    }

    await lesson.save();

    // Notify instructor
    const course = await lesson.populate('course');
    await Notification.create({
      recipient: course.course.instructor,
      sender: req.user.id,
      title: 'Assignment Submitted',
      message: `${user.name} submitted assignment "${lesson.title}"`,
      type: 'assignment_due',
      data: {
        lessonId: lesson._id,
        courseId: lesson.course,
        userId: req.user.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update submission
// @route   PUT /api/submissions/:id
// @access  Private
export const updateSubmission = async (req, res) => {
  try {
    const test = await Test.findOne({
      'submissions._id': req.params.id
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const submission = test.submissions.id(req.params.id);

    // Check authorization - only the student who submitted can update
    if (submission.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this submission'
      });
    }

    // Check if submission can be updated (only if in-progress)
    if (submission.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update submitted assignment'
      });
    }

    // Update submission
    Object.assign(submission, req.body);
    await test.save();

    res.json({
      success: true,
      message: 'Submission updated successfully',
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Grade submission
// @route   PUT /api/submissions/:id/grade
// @access  Private/Teacher
export const gradeSubmission = async (req, res) => {
  try {
    const { score, feedback, status } = req.body;
    
    const test = await Test.findOne({
      'submissions._id': req.params.id
    }).populate('submissions.user', 'name email');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check authorization
    if (test.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to grade this submission'
      });
    }

    const submission = test.submissions.id(req.params.id);
    
    // Update submission
    if (score !== undefined) {
      submission.score = score;
      const maxScore = test.questions.reduce((sum, q) => sum + q.points, 0);
      submission.percentage = Math.round((score / maxScore) * 100);
    }
    
    if (feedback) submission.feedback = feedback;
    if (status) submission.status = status;
    
    submission.gradedAt = new Date();

    await test.save();

    // Notify student
    await Notification.create({
      recipient: submission.user._id,
      sender: req.user.id,
      title: 'Assignment Graded',
      message: `Your submission for "${test.title}" has been graded`,
      type: 'test_graded',
      data: {
        testId: test._id,
        submissionId: submission._id,
        score: submission.percentage
      }
    });

    // Send real-time notification
    if (req.io) {
      req.io.to(`user_${submission.user._id}`).emit('notification', {
        type: 'test_graded',
        title: 'Assignment Graded',
        message: `Your submission for "${test.title}" has been graded`,
        data: { 
          testId: test._id,
          score: submission.percentage 
        }
      });
    }

    res.json({
      success: true,
      message: 'Submission graded successfully',
      data: {
        score: submission.score,
        percentage: submission.percentage,
        feedback: submission.feedback,
        status: submission.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};