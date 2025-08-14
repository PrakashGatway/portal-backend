import Test from '../models/Test.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Notification from '../models/Notification.js';

// @desc    Get all tests
// @route   GET /api/tests
// @access  Private
export const getTests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { course, type, instructor, published } = req.query;

    // Build filter
    const filter = {};
    if (course) filter.course = course;
    if (type) filter.type = type;
    if (instructor) filter.instructor = instructor;
    if (published !== undefined) filter['availability.published'] = published === 'true';

    // Students can only see published tests from their enrolled courses
    if (req.user.role === 'student') {
      const user = await User.findById(req.user.id);
      const enrolledCourses = user.courses.map(c => c.course);
      filter.course = { $in: enrolledCourses };
      filter['availability.published'] = true;
    }

    const tests = await Test.find(filter)
      .populate('course', 'title')
      .populate('instructor', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-questions.correctAnswer -questions.explanation');

    const total = await Test.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tests,
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

// @desc    Get single test
// @route   GET /api/tests/:id
// @access  Private
export const getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('course', 'title')
      .populate('instructor', 'name avatar');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user can access this test
    if (req.user.role === 'student') {
      const user = await User.findById(req.user.id);
      const isEnrolled = user.courses.some(c => c.course.toString() === test.course._id.toString());
      
      if (!isEnrolled || !test.availability.published) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this test'
        });
      }

      // Hide correct answers and explanations for students
      test.questions.forEach(q => {
        delete q.correctAnswer;
        delete q.explanation;
      });
    }

    // Check if user has already submitted
    const existingSubmission = test.submissions.find(
      s => s.user.toString() === req.user.id
    );

    res.json({
      success: true,
      data: {
        ...test.toObject(),
        hasSubmitted: !!existingSubmission,
        userSubmission: existingSubmission
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create test
// @route   POST /api/tests
// @access  Private/Teacher
export const createTest = async (req, res) => {
  try {
    const testData = {
      ...req.body,
      instructor: req.user.id
    };

    const test = await Test.create(testData);

    // Notify enrolled students if published
    if (test.availability.published && test.course) {
      const enrolledUsers = await User.find({
        'courses.course': test.course
      });

      const notifications = enrolledUsers.map(user => ({
        recipient: user._id,
        sender: req.user.id,
        title: 'New Test Available',
        message: `A new test "${test.title}" has been assigned`,
        type: 'test_assigned',
        data: {
          testId: test._id,
          courseId: test.course,
          url: `/tests/${test._id}`
        }
      }));

      await Notification.insertMany(notifications);

      // Send real-time notifications
      if (req.io) {
        enrolledUsers.forEach(user => {
          req.io.to(`user_${user._id}`).emit('notification', {
            type: 'test_assigned',
            title: 'New Test Available',
            message: `A new test "${test.title}" has been assigned`,
            data: { testId: test._id }
          });
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      data: test
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update test
// @route   PUT /api/tests/:id
// @access  Private/Teacher
export const updateTest = async (req, res) => {
  try {
    let test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check ownership
    if (test.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this test'
      });
    }

    test = await Test.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Test updated successfully',
      data: test
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete test
// @route   DELETE /api/tests/:id
// @access  Private/Teacher
export const deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check ownership
    if (test.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this test'
      });
    }

    await Test.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Test deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Submit test
// @route   POST /api/tests/:id/submit
// @access  Private/Student
export const submitTest = async (req, res) => {
  try {
    const { answers, timeSpent } = req.body;
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if test is available
    if (!test.availability.published) {
      return res.status(403).json({
        success: false,
        message: 'Test is not available'
      });
    }

    // Check if user is enrolled in the course
    const user = await User.findById(req.user.id);
    const isEnrolled = user.courses.some(c => c.course.toString() === test.course.toString());
    
    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Check if user has already submitted (and attempts limit)
    const existingSubmissions = test.submissions.filter(
      s => s.user.toString() === req.user.id
    );

    if (existingSubmissions.length >= test.settings.attempts) {
      return res.status(400).json({
        success: false,
        message: 'Maximum attempts reached'
      });
    }

    // Calculate score
    let totalScore = 0;
    let maxScore = 0;
    const gradedAnswers = [];

    test.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = JSON.stringify(userAnswer?.answer) === JSON.stringify(question.correctAnswer);
      const points = isCorrect ? question.points : 0;

      gradedAnswers.push({
        questionId: question._id,
        answer: userAnswer?.answer,
        isCorrect,
        points,
        timeSpent: userAnswer?.timeSpent || 0
      });

      totalScore += points;
      maxScore += question.points;
    });

    const percentage = Math.round((totalScore / maxScore) * 100);

    // Create submission
    const submission = {
      user: req.user.id,
      answers: gradedAnswers,
      score: totalScore,
      percentage,
      status: 'submitted',
      submittedAt: new Date(),
      timeSpent,
      attempt: existingSubmissions.length + 1
    };

    test.submissions.push(submission);

    // Update analytics
    test.analytics.totalAttempts += 1;
    const allScores = test.submissions.map(s => s.percentage);
    test.analytics.averageScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    test.analytics.passRate = (test.submissions.filter(s => s.percentage >= test.settings.passingScore).length / test.submissions.length) * 100;

    await test.save();

    // Send notification to instructor
    await Notification.create({
      recipient: test.instructor,
      sender: req.user.id,
      title: 'Test Submitted',
      message: `${user.name} submitted test "${test.title}"`,
      type: 'test_graded',
      data: {
        testId: test._id,
        userId: req.user.id,
        score: percentage
      }
    });

    res.json({
      success: true,
      message: 'Test submitted successfully',
      data: {
        score: totalScore,
        maxScore,
        percentage,
        passed: percentage >= test.settings.passingScore
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get test submissions
// @route   GET /api/tests/:id/submissions
// @access  Private/Teacher
export const getTestSubmissions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('submissions.user', 'name email avatar');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check ownership
    if (test.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view submissions'
      });
    }

    res.json({
      success: true,
      data: test.submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Grade submission
// @route   PUT /api/tests/submissions/:submissionId/grade
// @access  Private/Teacher
export const gradeSubmission = async (req, res) => {
  try {
    const { feedback, manualScore } = req.body;
    
    const test = await Test.findOne({
      'submissions._id': req.params.submissionId
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check ownership
    if (test.instructor.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to grade this submission'
      });
    }

    const submission = test.submissions.id(req.params.submissionId);
    submission.feedback = feedback;
    submission.status = 'graded';
    submission.gradedAt = new Date();

    if (manualScore !== undefined) {
      submission.score = manualScore;
      const maxScore = test.questions.reduce((sum, q) => sum + q.points, 0);
      submission.percentage = Math.round((manualScore / maxScore) * 100);
    }

    await test.save();

    // Notify student
    await Notification.create({
      recipient: submission.user,
      sender: req.user.id,
      title: 'Test Graded',
      message: `Your test "${test.title}" has been graded`,
      type: 'test_graded',
      data: {
        testId: test._id,
        score: submission.percentage
      }
    });

    res.json({
      success: true,
      message: 'Submission graded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};