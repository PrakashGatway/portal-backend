import mongoose from "mongoose";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Module from "../models/Modules.js";
import PurchasedCourse from "../models/PurchasedCourse.js";
import asyncHandler from '../middleware/async.js';

import Payment from "../models/Payment.js";
import { Lead } from "../models/Leads.js";
import { SupportTicket } from "../models/Support.js";
import { Notification } from "../models/Notification.js";
import { TestAttempt } from "../models/GGSschema/attemptSchema.js";
import IELTSAttempt from "../models/ielts/ieltsAttempt.js";

import {
  Content,
  LiveClass,
  RecordedClass,
  StudyMaterial,
  Session,
  Test,
} from "../models/Content.js";

import Feedback from "../models/feedback.js";

const { ObjectId } = mongoose;

export const getTeacherDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user._id;

    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    const now = new Date();

    let fromDate;
    let toDate = now;

    if (req.query.from) {
      fromDate = new Date(req.query.from);
    }

    if (req.query.to) {
      toDate = new Date(req.query.to);
      toDate.setHours(23, 59, 59, 999);
    }

    if (!fromDate) {
      const period = req.query.period || "30d";

      const days =
        {
          "7d": 7,
          "30d": 30,
          "90d": 90,
          "6m": 180,
          "1y": 365,
        }[period] || 30;

      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);
    }

    if (Number.isNaN(fromDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid from date",
      });
    }

    if (Number.isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid to date",
      });
    }

    // const courseId =
    //   req.query.courseId && mongoose.Types.ObjectId.isValid(req.query.courseId)
    //     ? new ObjectId(req.query.courseId)
    //     : null;

    const courseId = null;

    const teacherCourseMatch = {
      instructors: teacherObjectId,
    };

    if (courseId) {
      teacherCourseMatch._id = courseId;
    }
    const teacherCourses = await Course.aggregate([
      {
        $match: teacherCourseMatch,
      },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },

      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,
          title: 1,
          code: 1,
          slug: 1,
          status: 1,
          mode: 1,
          level: 1,
          language: 1,
          thumbnail: 1,
          schedule: 1,
          pricing: 1,
          instructors: 1,
          category: {
            _id: "$category._id",
            name: "$category.name",
          },
          createdAt: 1,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    const courseIds = teacherCourses.map((course) => course._id);

    /* ---------------------------------------------------------
       NO COURSES
    --------------------------------------------------------- */

    if (!courseIds.length) {
      const teacher = await User.findById(teacherObjectId)
        .select(
          "name email phoneNumber profilePic profile skills education experience achievements lastActive isVerified",
        )
        .lean();

      return res.status(200).json({
        success: true,
        data: {
          teacher,
          summary: {
            totalCourses: 0,
            totalStudents: 0,
            activeStudents: 0,
            totalContent: 0,
            publishedContent: 0,
            averageRating: 0,
            totalReviews: 0,
          },
          courses: [],
          enrollmentTrend: [],
          revenueTrend: [],
          contentAnalytics: {},
          liveClasses: {},
          recordedAnalytics: {},
          studentAnalytics: {},
          feedbackAnalytics: {},
          recentActivity: {},
          insights: [],
        },
      });
    }

    /* ---------------------------------------------------------
       COMMON MATCH
    --------------------------------------------------------- */

    const courseMatch = {
      course: {
        $in: courseIds,
      },
    };

    /* ---------------------------------------------------------
       RUN MAJOR ANALYTICS IN PARALLEL
    --------------------------------------------------------- */

    const [
      teacher,

      summary,

      courseAnalytics,

      contentAnalytics,

      liveClassAnalytics,

      recordedAnalytics,

      moduleAnalytics,

      feedbackAnalytics,

      studentAnalytics,

      recentEnrollments,

      upcomingClasses,

      recentContent,
    ] = await Promise.all([
      /* =======================================================
         TEACHER
      ======================================================= */

      User.findById(teacherObjectId)
        .select(
          "name email phoneNumber profilePic profile skills education experience achievements lastActive isVerified isActive",
        )
        .lean(),

      /* =======================================================
         SUMMARY
      ======================================================= */

      getTeacherSummary({
        courseIds,
        fromDate,
        toDate,
      }),

      /* =======================================================
         COURSE ANALYTICS
      ======================================================= */

      getCourseAnalytics({
        courseIds,
        fromDate,
        toDate,
      }),

      /* =======================================================
         CONTENT
      ======================================================= */

      getContentAnalytics({
        courseIds,
        fromDate,
        toDate,
      }),

      /* =======================================================
         LIVE CLASSES
      ======================================================= */

      getLiveClassAnalytics({
        courseIds,
        fromDate,
        toDate,
      }),

      /* =======================================================
         RECORDED VIDEOS
      ======================================================= */

      getRecordedAnalytics({
        courseIds,
      }),

      /* =======================================================
         MODULES
      ======================================================= */

      getModuleAnalytics({
        courseIds,
      }),

      /* =======================================================
         FEEDBACK
      ======================================================= */

      getFeedbackAnalytics({
        courseIds,
        fromDate,
        toDate,
      }),

      /* =======================================================
         STUDENT ANALYTICS
      ======================================================= */

      getStudentAnalytics({
        courseIds,
        fromDate,
        toDate,
      }),

      /* =======================================================
         RECENT ENROLLMENTS
      ======================================================= */

      getRecentEnrollments({
        courseIds,
      }),

      /* =======================================================
         UPCOMING CLASSES
      ======================================================= */

      getUpcomingClasses({
        courseIds,
      }),

      /* =======================================================
         RECENT CONTENT
      ======================================================= */

      getRecentContent({
        courseIds,
      }),
    ]);

    /* ---------------------------------------------------------
       INTELLIGENT DASHBOARD INSIGHTS
    --------------------------------------------------------- */

    const insights = generateTeacherInsights({
      summary,
      courseAnalytics,
      contentAnalytics,
      liveClassAnalytics,
      recordedAnalytics,
      feedbackAnalytics,
      studentAnalytics,
    });

    /* ---------------------------------------------------------
       FINAL RESPONSE
    --------------------------------------------------------- */

    return res.status(200).json({
      success: true,

      meta: {
        generatedAt: new Date(),
        dateRange: {
          from: fromDate,
          to: toDate,
        },
        courseFilter: courseId || null,
        totalCoursesIncluded: courseIds.length,
      },

      data: {
        teacher,

        summary,

        courses: courseAnalytics,

        // trends: {
        //   enrollment: enrollmentTrend,
        //   revenue: revenueTrend,
        // },

        content: contentAnalytics,

        liveClasses: liveClassAnalytics,

        recordedClasses: recordedAnalytics,

        modules: moduleAnalytics,

        // students: {
        //   overview: studentAnalytics,
        //   topStudents,
        //   atRiskStudents,
        // },

        feedback: feedbackAnalytics,

        recentActivity: {
          enrollments: recentEnrollments,
          content: recentContent,
          upcomingClasses,
        },

        insights,
      },
    });
  } catch (error) {
    console.error("Teacher dashboard error:", error);

    next(error);
  }
};

/* =============================================================
   SUMMARY
============================================================= */

const getTeacherSummary = async ({ courseIds, fromDate, toDate }) => {
  const [enrollmentStats, contentStats, ratingStats] = await Promise.all([
    PurchasedCourse.aggregate([
      {
        $match: {
          itemType: "Course",
          itemId: { $in: courseIds },
        },
      },

      {
        $facet: {
          total: [
            {
              $count: "count",
            },
          ],

          active: [
            {
              $match: {
                isActive: true,
                $or: [
                  {
                    accessExpiresAt: {
                      $exists: false,
                    },
                  },
                  {
                    accessExpiresAt: {
                      $gt: new Date(),
                    },
                  },
                ],
              },
            },

            {
              $count: "count",
            },
          ],

          completed: [
            {
              $match: {
                isCompleted: true,
              },
            },

            {
              $count: "count",
            },
          ],

          period: [
            {
              $match: {
                enrolledAt: {
                  $gte: fromDate,
                  $lte: toDate,
                },
              },
            },

            {
              $count: "count",
            },
          ],
        },
      },
    ]),

    Content.aggregate([
      {
        $match: courseMatch(courseIds),
      },

      {
        $facet: {
          total: [
            {
              $count: "count",
            },
          ],

          published: [
            {
              $match: {
                status: "published",
              },
            },

            {
              $count: "count",
            },
          ],
        },
      },
    ]),

    Feedback.aggregate([
      {
        $lookup: {
          from: "contents",
          localField: "video",
          foreignField: "_id",
          as: "content",
        },
      },

      {
        $unwind: "$content",
      },

      {
        $match: {
          "content.course": {
            $in: courseIds,
          },
          type: "rate_video",
          rating: {
            $exists: true,
          },
        },
      },

      {
        $group: {
          _id: null,
          averageRating: {
            $avg: "$rating",
          },
          totalReviews: {
            $sum: 1,
          },
        },
      },
    ]),
  ]);

  const enrollment = enrollmentStats[0] || {};

  const content = contentStats[0] || {};

  const ratings = ratingStats[0]?.[0] || {};

  return {
    totalCourses: courseIds.length,

    totalStudents: enrollment.total?.[0]?.count || 0,

    activeStudents: enrollment.active?.[0]?.count || 0,

    newStudentsInPeriod: enrollment.period?.[0]?.count || 0,

    totalContent: content.total?.[0]?.count || 0,

    publishedContent: content.published?.[0]?.count || 0,

    averageRating: Number((ratings.averageRating || 0).toFixed(2)),

    totalReviews: ratings.totalReviews || 0,
  };
};

/* =============================================================
   COURSE ANALYTICS
============================================================= */

const getCourseAnalytics = async ({ courseIds, fromDate, toDate }) => {
  return Course.aggregate([
    {
      $match: {
        _id: { $in: courseIds },
      },
    },

    {
      $lookup: {
        from: "purchasedcourses",
        let: {
          courseId: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$itemId", "$$courseId"],
                  },
                  {
                    $eq: ["$itemType", "Course"],
                  },
                ],
              },
            },
          },

          {
            $group: {
              _id: null,

              totalStudents: {
                $sum: 1,
              },

              activeStudents: {
                $sum: {
                  $cond: [{ $eq: ["$isActive", true] }, 1, 0],
                },
              },
              newStudents: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $gte: ["$enrolledAt", fromDate],
                        },
                        {
                          $lte: ["$enrolledAt", toDate],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        as: "enrollment",
      },
    },
    {
      $lookup: {
        from: "contents",
        let: {
          courseId: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$course", "$$courseId"],
              },
            },
          },

          {
            $group: {
              _id: "$__t",

              count: {
                $sum: 1,
              },
            },
          },
        ],
        as: "content",
      },
    },

    {
      $lookup: {
        from: "modules",
        localField: "_id",
        foreignField: "course",
        as: "modules",
      },
    },

    {
      $lookup: {
        from: "feedbacks",
        let: {
          courseId: "$_id",
        },
        pipeline: [
          {
            $lookup: {
              from: "contents",
              localField: "video",
              foreignField: "_id",
              as: "video",
            },
          },

          {
            $unwind: "$video",
          },

          {
            $match: {
              $expr: {
                $eq: ["$video.course", "$$courseId"],
              },
              type: "rate_video",
              rating: {
                $exists: true,
              },
            },
          },

          {
            $group: {
              _id: null,

              averageRating: {
                $avg: "$rating",
              },

              totalReviews: {
                $sum: 1,
              },
            },
          },
        ],
        as: "feedback",
      },
    },

    {
      $project: {
        _id: 1,
        title: 1,
        code: 1,
        slug: 1,
        status: 1,
        mode: 1,
        level: 1,
        language: 1,
        thumbnail: 1,
        schedule: 1,
        pricing: 1,

        enrollment: {
          $ifNull: [
            { $arrayElemAt: ["$enrollment", 0] },
            {
              totalStudents: 0,
              activeStudents: 0,
              newStudents: 0,
            },
          ],
        },

        content: 1,

        moduleCount: {
          $size: "$modules",
        },

        feedback: {
          $ifNull: [
            { $arrayElemAt: ["$feedback", 0] },
            {
              averageRating: 0,
              totalReviews: 0,
            },
          ],
        },
      },
    },

    {
      $addFields: {
        enrollmentCompletionRate: {
          $cond: [
            {
              $gt: ["$enrollment.totalStudents", 0],
            },
            {
              $multiply: [
                {
                  $divide: [
                    "$enrollment.completedStudents",
                    "$enrollment.totalStudents",
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },

    {
      $sort: {
        "enrollment.totalStudents": -1,
      },
    },
  ]);
};
/* =============================================================
   CONTENT ANALYTICS
============================================================= */

const getContentAnalytics = async ({ courseIds, fromDate, toDate }) => {
  return Content.aggregate([
    {
      $match: {
        course: {
          $in: courseIds,
        },
      },
    },

    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,

              total: {
                $sum: 1,
              },

              published: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$status", "published"],
                    },
                    1,
                    0,
                  ],
                },
              },

              draft: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$status", "draft"],
                    },
                    1,
                    0,
                  ],
                },
              },

              archived: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$status", "archived"],
                    },
                    1,
                    0,
                  ],
                },
              },

              scheduled: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$status", "scheduled"],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],

        byType: [
          {
            $group: {
              _id: "$__t",
              count: {
                $sum: 1,
              },
              published: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$status", "published"],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },

          {
            $sort: {
              count: -1,
            },
          },
        ],

        recent: [
          {
            $match: {
              createdAt: {
                $gte: fromDate,
                $lte: toDate,
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },

              created: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ],
      },
    },
  ]);
};

/* =============================================================
   LIVE CLASS ANALYTICS
============================================================= */

const getLiveClassAnalytics = async ({ courseIds, fromDate, toDate }) => {
  const result = await LiveClass.aggregate([
    {
      $match: {
        course: {
          $in: courseIds,
        },
      },
    },

    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,

              totalClasses: {
                $sum: 1,
              },

              completed: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $ne: ["$actualStart", null],
                        },
                        {
                          $ne: ["$actualEnd", null],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              upcoming: {
                $sum: {
                  $cond: [
                    {
                      $gt: ["$scheduledStart", new Date()],
                    },
                    1,
                    0,
                  ],
                },
              },

              totalScheduledMinutes: {
                $sum: {
                  $divide: [
                    {
                      $subtract: ["$scheduledEnd", "$scheduledStart"],
                    },
                    60000,
                  ],
                },
              },

              totalActualMinutes: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $ne: ["$actualStart", null],
                        },
                        {
                          $ne: ["$actualEnd", null],
                        },
                      ],
                    },
                    {
                      $divide: [
                        {
                          $subtract: ["$actualEnd", "$actualStart"],
                        },
                        60000,
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          },
        ],

        period: [
          {
            $match: {
              scheduledStart: {
                $gte: fromDate,
                $lte: toDate,
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$scheduledStart",
                },
              },

              classes: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ],
      },
    },
  ]);

  return {
    summary: result[0]?.summary?.[0] || {
      totalClasses: 0,
      completed: 0,
      upcoming: 0,
      totalScheduledMinutes: 0,
      totalActualMinutes: 0,
    },

    trend: result[0]?.period || [],
  };
};

/* =============================================================
   RECORDED CLASS ANALYTICS
============================================================= */

const getRecordedAnalytics = async ({ courseIds }) => {
  const result = await RecordedClass.aggregate([
    {
      $match: {
        course: {
          $in: courseIds,
        },
      },
    },

    {
      $group: {
        _id: null,

        totalVideos: {
          $sum: 1,
        },

        totalViews: {
          $sum: {
            $ifNull: ["$analytics.views", 0],
          },
        },

        totalLikes: {
          $sum: {
            $ifNull: ["$analytics.likes", 0],
          },
        },

        averageWatchTime: {
          $avg: {
            $ifNull: ["$analytics.averageWatchTime", 0],
          },
        },

        totalVideoDuration: {
          $sum: {
            $ifNull: ["$video.duration", 0],
          },
        },
      },
    },
  ]);

  const topVideos = await RecordedClass.aggregate([
    {
      $match: {
        course: {
          $in: courseIds,
        },
      },
    },

    {
      $sort: {
        "analytics.views": -1,
      },
    },

    {
      $limit: 10,
    },

    {
      $lookup: {
        from: "courses",
        localField: "course",
        foreignField: "_id",
        as: "course",
      },
    },

    {
      $unwind: {
        path: "$course",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 1,
        title: 1,
        course: {
          _id: "$course._id",
          title: "$course.title",
        },
        views: {
          $ifNull: ["$analytics.views", 0],
        },
        likes: {
          $ifNull: ["$analytics.likes", 0],
        },
        averageWatchTime: {
          $ifNull: ["$analytics.averageWatchTime", 0],
        },
        duration: {
          $ifNull: ["$video.duration", 0],
        },
      },
    },
  ]);

  return {
    summary: result[0] || {
      totalVideos: 0,
      totalViews: 0,
      totalLikes: 0,
      averageWatchTime: 0,
      totalVideoDuration: 0,
    },

    topVideos,
  };
};

/* =============================================================
   MODULE ANALYTICS
============================================================= */

const getModuleAnalytics = async ({ courseIds }) => {
  return Module.aggregate([
    {
      $match: {
        course: {
          $in: courseIds,
        },
      },
    },

    {
      $lookup: {
        from: "contents",
        localField: "_id",
        foreignField: "module",
        as: "contents",
      },
    },

    {
      $group: {
        _id: "$course",

        modules: {
          $sum: 1,
        },

        publishedModules: {
          $sum: {
            $cond: ["$isPublished", 1, 0],
          },
        },

        totalDuration: {
          $sum: "$duration",
        },

        contentCount: {
          $sum: {
            $size: "$contents",
          },
        },
      },
    },

    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "_id",
        as: "course",
      },
    },

    {
      $unwind: {
        path: "$course",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 0,
        courseId: "$_id",
        courseTitle: "$course.title",
        modules: 1,
        publishedModules: 1,
        totalDuration: 1,
        contentCount: 1,
      },
    },
  ]);
};

/* =============================================================
   FEEDBACK ANALYTICS
============================================================= */

const getFeedbackAnalytics = async ({ courseIds, fromDate, toDate }) => {
  const result = await Feedback.aggregate([
    {
      $lookup: {
        from: "contents",
        localField: "video",
        foreignField: "_id",
        as: "content",
      },
    },

    {
      $unwind: "$content",
    },

    {
      $match: {
        "content.course": {
          $in: courseIds,
        },
      },
    },

    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,

              totalFeedback: {
                $sum: 1,
              },

              totalRatings: {
                $sum: {
                  $cond: [
                    {
                      $ne: ["$rating", null],
                    },
                    1,
                    0,
                  ],
                },
              },

              averageRating: {
                $avg: "$rating",
              },

              issues: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$type", "report_issue"],
                    },
                    1,
                    0,
                  ],
                },
              },

              highSeverityIssues: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$severity", "high"],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],

        ratingDistribution: [
          {
            $match: {
              rating: {
                $ne: null,
              },
            },
          },

          {
            $group: {
              _id: "$rating",
              count: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              _id: -1,
            },
          },
        ],

        issueTypes: [
          {
            $match: {
              type: "report_issue",
            },
          },

          {
            $group: {
              _id: "$issueType",
              count: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              count: -1,
            },
          },
        ],

        recent: [
          {
            $match: {
              createdAt: {
                $gte: fromDate,
                $lte: toDate,
              },
            },
          },

          {
            $sort: {
              createdAt: -1,
            },
          },

          {
            $limit: 20,
          },

          {
            $project: {
              _id: 1,
              type: 1,
              rating: 1,
              message: 1,
              issueType: 1,
              severity: 1,
              createdAt: 1,
              video: "$content.title",
              course: "$content.course",
            },
          },
        ],
      },
    },
  ]);

  return {
    summary: result[0]?.summary?.[0] || {
      totalFeedback: 0,
      totalRatings: 0,
      averageRating: 0,
      issues: 0,
      highSeverityIssues: 0,
    },

    ratingDistribution: result[0]?.ratingDistribution || [],

    issueTypes: result[0]?.issueTypes || [],

    recent: result[0]?.recent || [],
  };
};

/* =============================================================
   STUDENT ANALYTICS
============================================================= */

const getStudentAnalytics = async ({ courseIds, fromDate, toDate }) => {
  const result = await PurchasedCourse.aggregate([
    {
      $match: {
        itemType: "Course",
        itemId: {
          $in: courseIds,
        },
      },
    },

    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,

              totalStudents: {
                $sum: 1,
              },

              activeStudents: {
                $sum: {
                  $cond: ["$isActive", 1, 0],
                },
              },

              completedStudents: {
                $sum: {
                  $cond: ["$isCompleted", 1, 0],
                },
              },

              averageProgress: {
                $avg: "$percentage",
              },

              averageTimeSpent: {
                $avg: "$totalTimeSpent",
              },

              studentsAbove80: {
                $sum: {
                  $cond: [
                    {
                      $gte: ["$percentage", 80],
                    },
                    1,
                    0,
                  ],
                },
              },

              studentsBelow20: {
                $sum: {
                  $cond: [
                    {
                      $lt: ["$percentage", 20],
                    },
                    1,
                    0,
                  ],
                },
              },

              recentlyActive: {
                $sum: {
                  $cond: [
                    {
                      $gte: ["$lastAccessedAt", fromDate],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],

        progressDistribution: [
          {
            $bucket: {
              groupBy: "$percentage",
              boundaries: [0, 20, 40, 60, 80, 101],
              default: "unknown",
              output: {
                students: {
                  $sum: 1,
                },
                averageTimeSpent: {
                  $avg: "$totalTimeSpent",
                },
              },
            },
          },
        ],

        activityTrend: [
          {
            $match: {
              lastAccessedAt: {
                $gte: fromDate,
                $lte: toDate,
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$lastAccessedAt",
                },
              },

              activeStudents: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ],
      },
    },
  ]);

  return {
    overview: result[0]?.overview?.[0] || {
      totalStudents: 0,
      activeStudents: 0,
      completedStudents: 0,
      averageProgress: 0,
      averageTimeSpent: 0,
      studentsAbove80: 0,
      studentsBelow20: 0,
      recentlyActive: 0,
    },

    progressDistribution: result[0]?.progressDistribution || [],

    activityTrend: result[0]?.activityTrend || [],
  };
};

/* =============================================================
   RECENT ENROLLMENTS
============================================================= */

const getRecentEnrollments = async ({ courseIds }) => {
  return PurchasedCourse.aggregate([
    {
      $match: {
        itemType: "Course",
        itemId: {
          $in: courseIds,
        },
      },
    },

    {
      $sort: {
        enrolledAt: -1,
      },
    },

    {
      $limit: 15,
    },

    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "student",
      },
    },

    {
      $unwind: {
        path: "$student",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "courses",
        localField: "itemId",
        foreignField: "_id",
        as: "course",
      },
    },

    {
      $unwind: {
        path: "$course",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 1,

        enrolledAt: 1,

        percentage: 1,

        isCompleted: 1,

        lastAccessedAt: 1,

        student: {
          _id: "$student._id",
          name: "$student.name",
          email: "$student.email",
          profilePic: "$student.profilePic",
        },

        course: {
          _id: "$course._id",
          title: "$course.title",
        },
      },
    },
  ]);
};

/* =============================================================
   UPCOMING CLASSES
============================================================= */

const getUpcomingClasses = async ({ courseIds }) => {
  const now = new Date();

  return LiveClass.aggregate([
    {
      $match: {
        course: {
          $in: courseIds,
        },

        scheduledStart: {
          $gte: now,
        },
      },
    },

    {
      $sort: {
        scheduledStart: 1,
      },
    },

    {
      $limit: 15,
    },

    {
      $lookup: {
        from: "courses",
        localField: "course",
        foreignField: "_id",
        as: "course",
      },
    },

    {
      $unwind: {
        path: "$course",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 1,

        title: 1,

        scheduledStart: 1,

        scheduledEnd: 1,

        actualStart: 1,

        actualEnd: 1,

        meetingId: 1,

        meetingUrl: 1,

        course: {
          _id: "$course._id",
          title: "$course.title",
        },
      },
    },
  ]);
};

/* =============================================================
   RECENT CONTENT
============================================================= */

const getRecentContent = async ({ courseIds }) => {
  return Content.aggregate([
    {
      $match: {
        course: {
          $in: courseIds,
        },
      },
    },

    {
      $sort: {
        createdAt: -1,
      },
    },

    {
      $limit: 20,
    },

    {
      $lookup: {
        from: "courses",
        localField: "course",
        foreignField: "_id",
        as: "course",
      },
    },

    {
      $unwind: {
        path: "$course",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 1,

        title: 1,

        status: 1,

        __t: 1,

        createdAt: 1,

        publishedAt: 1,

        duration: 1,

        course: {
          _id: "$course._id",
          title: "$course.title",
        },
      },
    },
  ]);
};

/* =============================================================
   INSIGHT ENGINE
============================================================= */

const generateTeacherInsights = ({
  summary,
  courseAnalytics,
  contentAnalytics,
  liveClassAnalytics,
  recordedAnalytics,
  feedbackAnalytics,
  studentAnalytics,
}) => {
  const insights = [];

  const averageProgress = studentAnalytics?.overview?.averageProgress || 0;

  const averageRating = summary?.averageRating || 0;

  const totalStudents = summary?.totalStudents || 0;

  const activeStudents = summary?.activeStudents || 0;

  const published = summary?.publishedContent || 0;

  const totalContent = summary?.totalContent || 0;

  /* -----------------------------------------------------------
     STUDENT ENGAGEMENT
  ----------------------------------------------------------- */

  if (totalStudents > 0 && activeStudents / totalStudents < 0.4) {
    insights.push({
      type: "warning",
      category: "engagement",
      priority: "high",
      title: "Student engagement is low",
      message: "Less than 40% of enrolled students are currently active.",
      action:
        "Consider sending reminders, assignments or live-session notifications.",
    });
  }

  /* -----------------------------------------------------------
     PROGRESS
  ----------------------------------------------------------- */

  if (averageProgress < 30) {
    insights.push({
      type: "warning",
      category: "progress",
      priority: "high",
      title: "Low average course progress",
      message: `Average student progress is ${averageProgress.toFixed(1)}%.`,
      action:
        "Review module difficulty and increase student engagement activities.",
    });
  }

  if (averageProgress >= 70) {
    insights.push({
      type: "success",
      category: "progress",
      priority: "medium",
      title: "Students are progressing well",
      message: `Average course progress is ${averageProgress.toFixed(1)}%.`,
      action: "Continue the current teaching strategy.",
    });
  }

  /* -----------------------------------------------------------
     CONTENT
  ----------------------------------------------------------- */

  if (totalContent > 0 && published / totalContent < 0.6) {
    insights.push({
      type: "warning",
      category: "content",
      priority: "medium",
      title: "Content publishing gap",
      message: "A significant portion of your course content is not published.",
      action: "Review draft and scheduled content before the next class.",
    });
  }

  /* -----------------------------------------------------------
     RATING
  ----------------------------------------------------------- */

  if (summary.totalReviews >= 5 && averageRating < 3.5) {
    insights.push({
      type: "warning",
      category: "quality",
      priority: "high",
      title: "Course rating needs attention",
      message: `Average learner rating is ${averageRating.toFixed(1)}/5.`,
      action: "Review recent feedback and identify recurring issues.",
    });
  }

  if (summary.totalReviews >= 5 && averageRating >= 4.5) {
    insights.push({
      type: "success",
      category: "quality",
      priority: "medium",
      title: "Excellent learner satisfaction",
      message: `Average learner rating is ${averageRating.toFixed(1)}/5.`,
      action: "Continue using the current teaching and content strategy.",
    });
  }

  /* -----------------------------------------------------------
     VIDEO
  ----------------------------------------------------------- */

  if (
    recordedAnalytics?.summary?.totalVideos > 0 &&
    recordedAnalytics.summary.totalViews === 0
  ) {
    insights.push({
      type: "warning",
      category: "video",
      priority: "medium",
      title: "Recorded content has low visibility",
      message: "Your recorded classes have not generated meaningful views yet.",
      action: "Promote recorded lessons through course announcements.",
    });
  }

  /* -----------------------------------------------------------
     LIVE CLASSES
  ----------------------------------------------------------- */

  if (liveClassAnalytics?.summary?.upcoming > 0) {
    insights.push({
      type: "info",
      category: "live_classes",
      priority: "low",
      title: "Upcoming classes scheduled",
      message: `${liveClassAnalytics.summary.upcoming} live classes are upcoming.`,
      action:
        "Review the schedule and make sure students have access to meeting links.",
    });
  }

  /* -----------------------------------------------------------
     TOP COURSE
  ----------------------------------------------------------- */

  if (courseAnalytics?.length) {
    const topCourse = courseAnalytics[0];

    if (topCourse?.enrollment?.totalStudents > 0) {
      insights.push({
        type: "success",
        category: "course",
        priority: "low",
        title: "Top performing course",
        message: `${topCourse.title} currently has ${topCourse.enrollment.totalStudents} students.`,
        courseId: topCourse._id,
      });
    }
  }

  return insights;
};

/* =============================================================
   HELPER
============================================================= */

const courseMatch = (courseIds) => ({
  course: {
    $in: courseIds,
  },
});

export default getTeacherDashboard;

const getStartDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const getPreviousStartDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days * 2);
  return date;
};

const getPercentageChange = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
};

const getAmount = (payment) => {
  return (
    payment.amount ??
    payment.totalAmount ??
    payment.paidAmount ??
    payment.finalAmount ??
    payment.price ??
    payment.total ??
    0
  );
};

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);

  const startDate = getStartDate(days);
  const previousStartDate = getPreviousStartDate(days);

  const now = new Date();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  /*
   * -------------------------------------------------------
   * BASIC COUNTS
   * -------------------------------------------------------
   */

  const [
    totalUsers,
    totalCourses,
    totalPurchases,
    totalPayments,
    totalNotifications,
    totalTestAttempts,
    totalIELTSAttempts,
  ] = await Promise.all([
    User.countDocuments(),

    Course.countDocuments(),

    PurchasedCourse.countDocuments(),

    Payment.countDocuments(),

    Notification.countDocuments(),

    TestAttempt.countDocuments(),

    IELTSAttempt.countDocuments(),
  ]);

  /*
   * -------------------------------------------------------
   * USER STATISTICS
   * -------------------------------------------------------
   */

  const [newUsersToday, newUsersPeriod, newUsersPreviousPeriod] =
    await Promise.all([
      User.countDocuments({
        createdAt: {
          $gte: startOfToday,
        },
      }),

      User.countDocuments({
        createdAt: {
          $gte: startDate,
        },
      }),

      User.countDocuments({
        createdAt: {
          $gte: previousStartDate,
          $lt: startDate,
        },
      }),
    ]);

  const userGrowth = getPercentageChange(
    newUsersPeriod,
    newUsersPreviousPeriod,
  );

  /*
   * -------------------------------------------------------
   * COURSE STATISTICS
   * -------------------------------------------------------
   */

  const publishedCourses = await Course.countDocuments({
    $or: [{ isPublished: true }, { published: true }, { status: "published" }],
  });

  /*
   * -------------------------------------------------------
   * PAYMENT / REVENUE
   * -------------------------------------------------------
   */

  const successfulPaymentFilter = {
    $or: [
      { status: "success" },
      { status: "successful" },
      { status: "completed" },
      { paymentStatus: "success" },
      { paymentStatus: "successful" },
      { paymentStatus: "completed" },
    ],
  };

  const [
    successfulPayments,
    monthPayments,
    todayPayments,
    periodPayments,
    previousPeriodPayments,
  ] = await Promise.all([
    Payment.find(successfulPaymentFilter)
      .select("amount totalAmount paidAmount finalAmount price total")
      .lean(),

    Payment.find({
      ...successfulPaymentFilter,
      createdAt: {
        $gte: startOfMonth,
      },
    })
      .select("amount totalAmount paidAmount finalAmount price total")
      .lean(),

    Payment.find({
      ...successfulPaymentFilter,
      createdAt: {
        $gte: startOfToday,
      },
    })
      .select("amount totalAmount paidAmount finalAmount price total")
      .lean(),

    Payment.find({
      ...successfulPaymentFilter,
      createdAt: {
        $gte: startDate,
      },
    })
      .select("amount totalAmount paidAmount finalAmount price total")
      .lean(),

    Payment.find({
      ...successfulPaymentFilter,
      createdAt: {
        $gte: previousStartDate,
        $lt: startDate,
      },
    })
      .select("amount totalAmount paidAmount finalAmount price total")
      .lean(),
  ]);

  const totalRevenue = successfulPayments.reduce(
    (sum, payment) => sum + getAmount(payment),
    0,
  );

  const monthRevenue = monthPayments.reduce(
    (sum, payment) => sum + getAmount(payment),
    0,
  );

  const todayRevenue = todayPayments.reduce(
    (sum, payment) => sum + getAmount(payment),
    0,
  );

  const periodRevenue = periodPayments.reduce(
    (sum, payment) => sum + getAmount(payment),
    0,
  );

  const previousPeriodRevenue = previousPeriodPayments.reduce(
    (sum, payment) => sum + getAmount(payment),
    0,
  );

  const revenueGrowth = getPercentageChange(
    periodRevenue,
    previousPeriodRevenue,
  );

  /*
   * -------------------------------------------------------
   * PURCHASE STATISTICS
   * -------------------------------------------------------
   */

  const [purchasesPeriod, purchasesPreviousPeriod] = await Promise.all([
    PurchasedCourse.countDocuments({
      createdAt: {
        $gte: startDate,
      },
    }),

    PurchasedCourse.countDocuments({
      createdAt: {
        $gte: previousStartDate,
        $lt: startDate,
      },
    }),
  ]);

  const purchaseGrowth = getPercentageChange(
    purchasesPeriod,
    purchasesPreviousPeriod,
  );


  /*
   * -------------------------------------------------------
   * SUPPORT
   * -------------------------------------------------------
   */

  const openSupportTickets = await SupportTicket.countDocuments({
    $or: [
      { status: "open" },
      { status: "pending" },
      { status: "Open" },
      { status: "Pending" },
    ],
  });

  /*
   * -------------------------------------------------------
   * PAYMENT STATUS
   * -------------------------------------------------------
   */

  const [pendingPayments, failedPayments] = await Promise.all([
    Payment.countDocuments({
      $or: [{ status: "pending" }, { paymentStatus: "pending" }],
    }),

    Payment.countDocuments({
      $or: [{ status: "failed" }, { paymentStatus: "failed" }],
    }),
  ]);

  /*
   * -------------------------------------------------------
   * RECENT USERS
   * -------------------------------------------------------
   */

  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .select("_id name email avatar profileImage createdAt role")
    .lean();

  /*
   * -------------------------------------------------------
   * RECENT PAYMENTS
   * -------------------------------------------------------
   */

  const recentPayments = await Payment.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .select(
      "_id user amount totalAmount paidAmount finalAmount price status paymentStatus createdAt",
    )
    .populate("user", "name email")
    .lean();

  /*
   * -------------------------------------------------------
   * RECENT PURCHASES
   * -------------------------------------------------------
   */

  const recentPurchases = await PurchasedCourse.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("user", "name email")
    .populate("itemType", "title name thumbnail image")
    .lean();

  /*
   * -------------------------------------------------------
   * RECENT SUPPORT REQUESTS
   * -------------------------------------------------------
   */

  const recentSupport = await SupportTicket.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  /*
   * -------------------------------------------------------
   * MONTHLY USER GROWTH
   * -------------------------------------------------------
   */

  const userGrowthChart = await User.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
      },
    },

    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },

        count: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
  ]);

  /*
   * -------------------------------------------------------
   * MONTHLY PURCHASE GROWTH
   * -------------------------------------------------------
   */

  const purchaseGrowthChart = await PurchasedCourse.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
      },
    },

    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },

        count: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
  ]);

  /*
   * -------------------------------------------------------
   * MONTHLY REVENUE
   * -------------------------------------------------------
   */

  const revenueChart = await Payment.aggregate([
    {
      $match: {
        ...successfulPaymentFilter,
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
      },
    },

    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },

        revenue: {
          $sum: {
            $ifNull: [
              "$amount",
              {
                $ifNull: [
                  "$totalAmount",
                  {
                    $ifNull: [
                      "$paidAmount",
                      {
                        $ifNull: [
                          "$finalAmount",
                          {
                            $ifNull: ["$price", "$total"],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },

    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
  ]);

  /*
   * -------------------------------------------------------
   * RESPONSE
   * -------------------------------------------------------
   */

  return res.status(200).json({
    success: true,

    message: "Admin dashboard fetched successfully",

    data: {
      period: {
        days,
        startDate,
        endDate: now,
      },

      overview: {
        users: {
          total: totalUsers,
          today: newUsersToday,
          period: newUsersPeriod,
          growth: userGrowth,
        },

        revenue: {
          total: totalRevenue,
          today: todayRevenue,
          month: monthRevenue,
          period: periodRevenue,
          growth: revenueGrowth,
        },

        courses: {
          total: totalCourses,
          published: publishedCourses,
        },

        purchases: {
          total: totalPurchases,
          period: purchasesPeriod,
          growth: purchaseGrowth,
        },
      },

      stats: {
        payments: {
          total: totalPayments,
          pending: pendingPayments,
          failed: failedPayments,
          successful: successfulPayments.length,
        },

        tests: {
          totalAttempts: totalTestAttempts,
          ieltsAttempts: totalIELTSAttempts,
        },

        support: {
          open: openSupportTickets,
        },

        notifications: {
          total: totalNotifications,
        },
      },

      charts: {
        userGrowth: userGrowthChart,

        purchaseGrowth: purchaseGrowthChart,

        revenue: revenueChart,
      },

      recent: {
        users: recentUsers,

        payments: recentPayments,

        purchases: recentPurchases,

        support: recentSupport,
      },
    },
  });
});