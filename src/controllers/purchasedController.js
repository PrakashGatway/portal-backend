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
    sort = "-enrolledAt",
    type="Course",
    itemId,
    isActive,
    isCompleted,
    enrolledStart,
    enrolledEnd,
    accessStart,
    accessEnd,
    minPercentage,
    maxPercentage,
    includeExpired = "false",
  } = req.query;

  if (!type) {
    return res.status(400).json({
      success: false,
      message: "type is required.",
    });
  }

  const collectionMap = {
    Course: "courses",
    package: "packages",
    McuTestSeries: "mcutestseries",
    TestTemplate: "testtemplates",
    subscription: "subscriptions",
    ilets: "ilets",
  };

  if (!collectionMap[type]) {
    return res.status(400).json({
      success: false,
      message: "Invalid item type.",
    });
  }

  const matchStage = {
    user: new mongoose.Types.ObjectId(req.user._id),
    itemType: type,
  };

  if (isActive !== undefined) {
    matchStage.isActive = isActive === "true";
  } else {
    matchStage.isActive = true;
  }

  if (isCompleted !== undefined) {
    matchStage.isCompleted = isCompleted === "true";
  }

  // if (
  //   minPercentage !== undefined ||
  //   maxPercentage !== undefined
  // ) {
  //   matchStage.percentage = {};

  //   if (minPercentage !== undefined) {
  //     matchStage.percentage.$gte = Number(minPercentage);
  //   }

  //   if (maxPercentage !== undefined) {
  //     matchStage.percentage.$lte = Number(maxPercentage);
  //   }
  // }

  const addDateRange = (field, start, end) => {
    const range = {};

    if (start) {
      const d = new Date(start);
      if (!isNaN(d.getTime())) {
        range.$gte = d;
      }
    }

    if (end) {
      const d = new Date(end);
      if (!isNaN(d.getTime())) {
        range.$lte = d;
      }
    }

    if (Object.keys(range).length) {
      matchStage[field] = range;
    }
  };

  addDateRange("enrolledAt", enrolledStart, enrolledEnd);
  addDateRange("accessExpiresAt", accessStart, accessEnd);

  if (includeExpired !== "true") {
    matchStage.$or = [
      { accessExpiresAt: null },
      { accessExpiresAt: { $exists: false } },
      { accessExpiresAt: { $gte: new Date() } },
    ];
  }

  const sortStage = {};

  sort.split(",").forEach((field) => {
    field = field.trim();

    if (!field) return;

    if (field.startsWith("-")) {
      sortStage[field.substring(1)] = -1;
    } else {
      sortStage[field] = 1;
    }
  });

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(parseInt(limit, 10) || 10, 100);
  const skip = (pageNumber - 1) * limitNumber;

  const pipeline = [
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: collectionMap[type],
        localField: "itemId",
        foreignField: "_id",
        as: "item",
      },
    },
    {
      $unwind: {
        path: "$item",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        isExpired: {
          $cond: [
            {
              $and: [
                { $ne: ["$accessExpiresAt", null] },
                { $lt: ["$accessExpiresAt", new Date()] },
              ],
            },
            true,
            false,
          ],
        },
      },
    },
    {
      $sort: sortStage,
    },
    {
      $skip: skip,
    },
    {
      $limit: limitNumber,
    },
  ];

  const [data, total] = await Promise.all([
    PurchasedCourse.aggregate(pipeline),
    PurchasedCourse.countDocuments(matchStage),
  ]);

  res.status(200).json({
    success: true,
    count: total,
    data,
    pagination: {
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
      limit: limitNumber,
      hasPrev: pageNumber > 1,
      hasNext: pageNumber < Math.ceil(total / limitNumber),
    },
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