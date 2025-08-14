import User from '../models/User.js';
import Course from '../models/Course.js';
import Test from '../models/Test.js';
import Payment from '../models/Payment.js';
import LiveClass from '../models/LiveClass.js';
import Lesson from '../models/Lesson.js';

// @desc    Get dashboard statistics
// @route   GET /api/analytics/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let stats = {};

    if (req.user.role === 'student') {
      // Student dashboard stats
      const user = await User.findById(req.user.id).populate('courses.course');
      
      stats = {
        enrolledCourses: user.courses.length,
        completedLessons: user.courses.reduce((total, course) => 
          total + course.completedLessons.length, 0
        ),
        averageProgress: user.courses.length > 0 
          ? user.courses.reduce((total, course) => total + course.progress, 0) / user.courses.length
          : 0,
        upcomingClasses: await LiveClass.countDocuments({
          course: { $in: user.courses.map(c => c.course._id) },
          scheduledStart: { $gte: now },
          status: 'scheduled'
        }),
        recentTests: await Test.find({
          course: { $in: user.courses.map(c => c.course._id) },
          'availability.published': true,
          createdAt: { $gte: startDate }
        }).countDocuments(),
        testScores: await Test.aggregate([
          {
            $match: {
              'submissions.user': req.user.id,
              'submissions.status': 'submitted'
            }
          },
          {
            $unwind: '$submissions'
          },
          {
            $match: {
              'submissions.user': req.user.id
            }
          },
          {
            $group: {
              _id: null,
              averageScore: { $avg: '$submissions.percentage' },
              totalTests: { $sum: 1 }
            }
          }
        ])
      };

    } else if (req.user.role === 'teacher') {
      // Teacher dashboard stats
      const teacherCourses = await Course.find({ instructor: req.user.id });
      const courseIds = teacherCourses.map(c => c._id);

      stats = {
        totalCourses: teacherCourses.length,
        totalStudents: teacherCourses.reduce((total, course) => 
          total + course.studentsCount, 0
        ),
        totalRevenue: await Payment.aggregate([
          {
            $match: {
              course: { $in: courseIds },
              status: 'completed',
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]).then(result => result[0]?.total || 0),
        averageRating: teacherCourses.length > 0
          ? teacherCourses.reduce((total, course) => 
              total + course.rating.average, 0) / teacherCourses.length
          : 0,
        upcomingClasses: await LiveClass.countDocuments({
          instructor: req.user.id,
          scheduledStart: { $gte: now },
          status: 'scheduled'
        }),
        pendingSubmissions: await Test.aggregate([
          {
            $match: {
              instructor: req.user.id,
              'submissions.status': 'submitted'
            }
          },
          {
            $unwind: '$submissions'
          },
          {
            $match: {
              'submissions.status': 'submitted'
            }
          },
          {
            $count: 'total'
          }
        ]).then(result => result[0]?.total || 0)
      };

    } else if (['admin', 'super_admin'].includes(req.user.role)) {
      // Admin dashboard stats
      stats = {
        totalUsers: await User.countDocuments(),
        totalCourses: await Course.countDocuments(),
        totalRevenue: await Payment.aggregate([
          {
            $match: {
              status: 'completed',
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]).then(result => result[0]?.total || 0),
        newUsers: await User.countDocuments({
          createdAt: { $gte: startDate }
        }),
        newCourses: await Course.countDocuments({
          createdAt: { $gte: startDate }
        }),
        activeUsers: await User.countDocuments({
          lastActive: { $gte: startDate }
        }),
        totalEnrollments: await User.aggregate([
          {
            $unwind: '$courses'
          },
          {
            $match: {
              'courses.enrolledAt': { $gte: startDate }
            }
          },
          {
            $count: 'total'
          }
        ]).then(result => result[0]?.total || 0)
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get course analytics
// @route   GET /api/analytics/courses/:id
// @access  Private/Teacher/Admin
export const getCourseAnalytics = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check authorization
    if (course.instructor._id.toString() !== req.user.id && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view course analytics'
      });
    }

    // Get enrollment data over time
    const enrollmentData = await User.aggregate([
      { $unwind: '$courses' },
      { $match: { 'courses.course': course._id } },
      {
        $group: {
          _id: {
            year: { $year: '$courses.enrolledAt' },
            month: { $month: '$courses.enrolledAt' },
            day: { $dayOfMonth: '$courses.enrolledAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get completion rates
    const completionData = await User.aggregate([
      { $unwind: '$courses' },
      { $match: { 'courses.course': course._id } },
      {
        $group: {
          _id: null,
          averageProgress: { $avg: '$courses.progress' },
          totalStudents: { $sum: 1 },
          completedStudents: {
            $sum: { $cond: [{ $gte: ['$courses.progress', 100] }, 1, 0] }
          }
        }
      }
    ]);

    // Get lesson engagement
    const lessons = await Lesson.find({ course: course._id });
    const lessonEngagement = await Promise.all(
      lessons.map(async (lesson) => ({
        lessonId: lesson._id,
        title: lesson.title,
        completions: lesson.completions.length,
        averageTime: lesson.completions.reduce((sum, c) => sum + (c.timeSpent || 0), 0) / 
                    (lesson.completions.length || 1)
      }))
    );

    // Get test performance
    const testPerformance = await Test.aggregate([
      { $match: { course: course._id } },
      { $unwind: '$submissions' },
      {
        $group: {
          _id: '$_id',
          title: { $first: '$title' },
          averageScore: { $avg: '$submissions.percentage' },
          totalSubmissions: { $sum: 1 },
          passRate: {
            $avg: {
              $cond: [
                { $gte: ['$submissions.percentage', '$settings.passingScore'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get revenue data
    const revenueData = await Payment.aggregate([
      {
        $match: {
          course: course._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const analytics = {
      overview: {
        totalStudents: course.studentsCount,
        averageRating: course.rating.average,
        totalReviews: course.rating.count,
        completionRate: completionData[0]?.completedStudents / completionData[0]?.totalStudents * 100 || 0,
        averageProgress: completionData[0]?.averageProgress || 0
      },
      enrollments: enrollmentData,
      lessonEngagement,
      testPerformance,
      revenue: {
        total: revenueData.reduce((sum, item) => sum + item.revenue, 0),
        monthly: revenueData
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user analytics
// @route   GET /api/analytics/users/:id
// @access  Private/Admin
export const getUserAnalytics = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('courses.course', 'title category');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get learning progress over time
    const progressData = await User.aggregate([
      { $match: { _id: user._id } },
      { $unwind: '$courses' },
      {
        $lookup: {
          from: 'lessons',
          localField: 'courses.completedLessons',
          foreignField: '_id',
          as: 'completedLessonsData'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$courses.enrolledAt' },
            month: { $month: '$courses.enrolledAt' }
          },
          coursesEnrolled: { $sum: 1 },
          averageProgress: { $avg: '$courses.progress' }
        }
      }
    ]);

    // Get test performance
    const testPerformance = await Test.aggregate([
      { $unwind: '$submissions' },
      { $match: { 'submissions.user': user._id } },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$submissions.percentage' },
          totalTests: { $sum: 1 },
          passedTests: {
            $sum: {
              $cond: [
                { $gte: ['$submissions.percentage', 60] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get activity data
    const activityData = {
      totalCourses: user.courses.length,
      completedCourses: user.courses.filter(c => c.progress >= 100).length,
      totalLessons: user.courses.reduce((sum, c) => sum + c.completedLessons.length, 0),
      averageProgress: user.courses.reduce((sum, c) => sum + c.progress, 0) / user.courses.length || 0,
      lastActive: user.lastActive,
      joinDate: user.createdAt
    };

    // Get spending data
    const spendingData = await Payment.aggregate([
      {
        $match: {
          user: user._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          totalPurchases: { $sum: 1 }
        }
      }
    ]);

    const analytics = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        joinDate: user.createdAt
      },
      activity: activityData,
      progress: progressData,
      testPerformance: testPerformance[0] || {
        averageScore: 0,
        totalTests: 0,
        passedTests: 0
      },
      spending: spendingData[0] || {
        totalSpent: 0,
        totalPurchases: 0
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get revenue analytics
// @route   GET /api/analytics/revenue
// @access  Private/Admin
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { timeframe = '12m' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '12m':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // Get revenue over time
    const revenueOverTime = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get revenue by course category
    const revenueByCategory = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          course: { $exists: true },
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      { $unwind: '$courseData' },
      {
        $group: {
          _id: '$courseData.category',
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Get top performing courses
    const topCourses = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          course: { $exists: true },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$course',
          revenue: { $sum: '$amount' },
          enrollments: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      { $unwind: '$courseData' },
      {
        $project: {
          title: '$courseData.title',
          instructor: '$courseData.instructor',
          revenue: 1,
          enrollments: 1
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Get overall metrics
    const overallMetrics = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' }
        }
      }
    ]);

    // Get refund data
    const refundData = await Payment.aggregate([
      {
        $match: {
          status: 'refunded',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRefunds: { $sum: '$refund.amount' },
          refundCount: { $sum: 1 }
        }
      }
    ]);

    const analytics = {
      overview: overallMetrics[0] || {
        totalRevenue: 0,
        totalTransactions: 0,
        averageOrderValue: 0
      },
      revenueOverTime,
      revenueByCategory,
      topCourses,
      refunds: refundData[0] || {
        totalRefunds: 0,
        refundCount: 0
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};