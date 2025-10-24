import mongoose from 'mongoose';
import PurchasedCourse from '../models/PurchasedCourse.js';
import Course from '../models/Course.js';
import asyncHandler from '../middleware/async.js';
import { Content } from '../models/Content.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getUserPurchasedCourses = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = '-enrolledAt',
    populate = '',
    isActive,
    isCompleted,
    course,
    enrolledStart,
    enrolledEnd,
    accessStart,
    accessEnd,
    minProgress,
    maxProgress,
    includeExpired = 'false'
  } = req.query;

  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  const userIdObj = new mongoose.Types.ObjectId(userId);

  const matchStage = { user: userIdObj };

  if (isActive !== undefined) matchStage.isActive = isActive === 'true';
  if (isCompleted !== undefined) matchStage.isCompleted = isCompleted === 'true';

  if (course && mongoose.Types.ObjectId.isValid(course)) {
    matchStage.course = new mongoose.Types.ObjectId(course);
  }

  const addDateRange = (field, start, end, obj) => {
    const range = {};
    if (start) {
      const d = new Date(start);
      if (!isNaN(d.getTime())) range.$gte = d;
    }
    if (end) {
      const d = new Date(end);
      if (!isNaN(d.getTime())) range.$lte = d;
    }
    if (Object.keys(range).length > 0) {
      obj[field] = range;
    }
  };

  addDateRange('enrolledAt', enrolledStart, enrolledEnd, matchStage);
  addDateRange('accessExpiresAt', accessStart, accessEnd, matchStage);

  if (minProgress || maxProgress) {
    matchStage['progress.percentage'] = {};
    const min = parseInt(minProgress, 10);
    const max = parseInt(maxProgress, 10);
    if (!isNaN(min)) matchStage['progress.percentage'].$gte = min;
    if (!isNaN(max)) matchStage['progress.percentage'].$lte = max;
  }

  if (includeExpired !== 'true') {
    matchStage.$or = [
      { accessExpiresAt: { $exists: false } },
      { accessExpiresAt: { $gte: new Date() } }
    ];
  }

  const pipeline = [];
  const populateFields = new Set(populate.split(',').map(s => s.trim()));

  if (populateFields.has('course') || populateFields.has('all')) {
    pipeline.push({
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'course',
        pipeline: [
          {
            $project: {
              _id: 1,
              title: 1,
              slug: 1,
              shortDescription: 1,
              thumbnail: 1,
              level: 1,
              language: 1,
              status: 1,
              subtitle: 1,
              duration: 1,
              rating: 1,
              studentsEnrolled: 1
            }
          }
        ]
      }
    });
    pipeline.push({
      $addFields: {
        course: { $arrayElemAt: ['$course', 0] }
      }
    });
  }

  if (populateFields.has('progress') || populateFields.has('all')) {
    pipeline.push({
      $lookup: {
        from: 'contents', // 👈 Ensure this matches your Content collection name
        localField: 'progress.completedLessons.lesson',
        foreignField: '_id',
        as: 'completedLessonsPopulated'
      }
    });
    pipeline.push({
      $addFields: {
        'progress.completedLessons': {
          $map: {
            input: '$progress.completedLessons',
            as: 'item',
            in: {
              lesson: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$completedLessonsPopulated',
                      cond: { $eq: ['$$this._id', '$$item.lesson'] }
                    }
                  },
                  0
                ]
              },
              completedAt: '$$item.completedAt'
            }
          }
        }
      }
    });
    pipeline.push({ $unset: 'completedLessonsPopulated' });
  }

  // Lookup recent lessons
  if (populateFields.has('recent') || populateFields.has('all')) {
    pipeline.push({
      $lookup: {
        from: 'contents',
        localField: 'recentLessons.lesson',
        foreignField: '_id',
        as: 'recentLessonsPopulated'
      }
    });
    pipeline.push({
      $addFields: {
        recentLessons: {
          $map: {
            input: '$recentLessons',
            as: 'item',
            in: {
              lesson: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$recentLessonsPopulated',
                      cond: { $eq: ['$$this._id', '$$item.lesson'] }
                    }
                  },
                  0
                ]
              },
              progress: '$$item.progress',
              durationWatched: '$$item.durationWatched'
            }
          }
        }
      }
    });
    pipeline.push({ $unset: 'recentLessonsPopulated' });
  }

  // === 3. ADD VIRTUAL: isExpired ===
  pipeline.push({
    $addFields: {
      isExpired: {
        $cond: {
          if: { $and: [{ $ne: ['$accessExpiresAt', null] }, { $ne: ['$accessExpiresAt', undefined] }] },
          then: { $lt: ['$accessExpiresAt', new Date()] },
          else: false
        }
      }
    }
  });

  // === 4. BUILD SORT STAGE ===
  const sortStage = {};
  sort.split(',').forEach(field => {
    field = field.trim();
    if (field.startsWith('-')) {
      sortStage[field.substring(1)] = -1;
    } else {
      sortStage[field] = 1;
    }
  });

  // === 5. EXECUTE AGGREGATION WITH PAGINATION ===
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
  const skip = (pageNum - 1) * limitNum;

  const fullPipeline = [
    { $match: matchStage },
    ...pipeline,
    { $sort: sortStage },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limitNum }],
        totalCount: [{ $count: 'count' }]
      }
    }
  ];

  const [result] = await PurchasedCourse.aggregate(fullPipeline);
  const data = result.data || [];
  const total = result.totalCount.length > 0 ? result.totalCount[0].count : 0;

  // === 6. SEND RESPONSE ===
  res.status(200).json({
    success: true,
    count: total,
    data,
    pagination: {
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < Math.ceil(total / limitNum)
    }
  });
});

const getUserLearningStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const stats = await PurchasedCourse.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        totalEnrolled: { $sum: 1 },
        activeCourses: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $not: '$accessExpiresAt' },
                  { $gte: ['$accessExpiresAt', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        completedCourses: { $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] } },
        avgProgress: { $avg: '$progress.percentage' },
        totalTimeSpent: { $sum: '$totalTimeSpent' }
      }
    },
    {
      $project: {
        _id: 0,
        totalEnrolled: 1,
        activeCourses: 1,
        completedCourses: 1,
        completionRate: { $round: [{ $multiply: [{ $divide: ['$completedCourses', '$totalEnrolled'] }, 100] }, 2] },
        avgProgress: { $round: ['$avgProgress', 2] },
        totalTimeSpent: 1
      }
    }
  ]);

  res.json({
    success: true,
    stats: stats[0] || {
      totalEnrolled: 0,
      activeCourses: 0,
      completedCourses: 0,
      completionRate: 0,
      avgProgress: 0,
      totalTimeSpent: 0
    }
  });
});

const getPurchasedCourseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { populate = 'course,progress,recent' } = req.query;
  const userId = req.user.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid enrollment ID' });
  }

  let query = PurchasedCourse.findById(id).lean();

  const popPaths = buildPopulation(populate);
  if (popPaths.length) query = query.populate(popPaths);

  const doc = await query;

  if (!doc || doc.user.toString() !== userId) {
    return res.status(404).json({ success: false, message: 'Enrollment not found' });
  }

  // Manual virtual
  const isExpired = doc.accessExpiresAt ? new Date(doc.accessExpiresAt) < new Date() : false;
  if (!doc.isActive || isExpired) {
    return res.status(403).json({ success: false, message: 'Access denied: course expired or revoked' });
  }

  // Update lastAccessedAt (non-blocking)
  PurchasedCourse.updateOne({ _id: id }, { lastAccessedAt: new Date() }).catch(console.error);

  res.json({
    success: true,
    data: {
      ...doc,
      isExpired
    }
  });
})

const updateContentProgress = asyncHandler(async (req, res) => {

  const { id } = req.params;
  const { contentId, progress = 0, durationWatched = 0 } = req.body;
  const userId = req.user.id;

  if (!isValidObjectId(id) || !isValidObjectId(contentId)) {
    return res.status(400).json({ success: false, message: 'Invalid ID(s)' });
  }
  if (progress < 0 || progress > 100 || durationWatched < 0) {
    return res.status(400).json({ success: false, message: 'Invalid progress or duration' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchasedCourse = await PurchasedCourse.findOne({
      _id: id,
      user: userId,
      isActive: true
    }).session(session);

    if (!purchasedCourse || (purchasedCourse.accessExpiresAt && new Date(purchasedCourse.accessExpiresAt) < new Date())) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: 'Access expired' });
    }

    const content = await Content.findOne({
      _id: contentId,
      course: purchasedCourse.course,
      status: 'published'
    }).session(session);

    if (!content) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    await session.commitTransaction();
    session.endSession();

    const updated = await PurchasedCourse.findById(id)
      .populate(buildPopulation('progress,recent'))
      .lean();

    res.json({ success: true, updated });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Progress update error:', error);
    return res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// 🚫 Revoke access
const revokeAccess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID' });
  }

  const result = await PurchasedCourse.updateOne(
    { _id: id, user: userId },
    {
      isActive: false,
      revokedReason: reason || 'Revoked by user',
      accessExpiresAt: new Date() // immediately expire
    }
  );

  if (result.modifiedCount === 0) {
    return res.status(404).json({ success: false, message: 'Not found or not owned' });
  }

  res.json({ success: true, message: 'Access revoked' });
});

export {
  getUserPurchasedCourses,
  getUserLearningStats,
  getPurchasedCourseById,
  updateContentProgress,
  revokeAccess
};