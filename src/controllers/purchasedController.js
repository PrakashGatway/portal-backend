import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import PurchasedCourse from '../models/PurchasedCourse.js';
import Course from '../models/Course.js';
import Content from '../models/Content.js'; // Base model for all content types


const calculateWeightedProgress = async (completedContentIds, courseId) => {
  const totalDuration = await Content.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId), status: 'published' } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$duration", 1] } } } }
  ]);

  const completedDuration = await Content.aggregate([
    { $match: { _id: { $in: completedContentIds.map(id => new mongoose.Types.ObjectId(id)) } } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$duration", 1] } } } }
  ]);

  const total = totalDuration[0]?.total || 1;
  const completed = completedDuration[0]?.total || 0;
  return Math.min(100, Math.round((completed / total) * 100));
};

const enrollInCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user.id;

  // Validate course
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Check if already enrolled
  const existing = await PurchasedCourse.findOne({ user: userId, course: courseId });
  if (existing && existing.isActive) {
    return res.status(200).json({ success: true, data: existing });
  }

  let accessExpiresAt = null;
  if (course.schedule?.endDate) {
    accessExpiresAt = new Date(course.schedule.endDate);
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 30);
  }

  const purchasedCourse = await PurchasedCourse.create({
    user: userId,
    course: courseId,
    accessExpiresAt,
    isActive: true
  });

  res.status(201).json({
    success: true,
    data: purchasedCourse
  });
});

const getUserPurchasedCourses = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const purchasedCourses = await PurchasedCourse.find({
    user: userId,
    isActive: true,
    $or: [
      { accessExpiresAt: { $exists: false } },
      { accessExpiresAt: { $gte: new Date() } }
    ]
  })
    .populate('course', 'title slug thumbnail language level status')
    .sort({ enrolledAt: -1 });

  res.json({
    success: true,
    count: purchasedCourses.length,
    data: purchasedCourses
  });
});


const getPurchasedCourseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const purchasedCourse = await PurchasedCourse.findById(id)
    .populate('course')
    .populate({
      path: 'progress.completedLessons.lesson',
      select: 'title duration slug __t'
    })
    .populate({
      path: 'recentLessons.lesson',
      select: 'title duration slug __t'
    });

  if (!purchasedCourse || purchasedCourse.user.toString() !== userId) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  if (!purchasedCourse.isActive || purchasedCourse.isExpired) {
    res.status(403);
    throw new Error('Course access expired or revoked');
  }

  purchasedCourse.lastAccessedAt = new Date();
  await purchasedCourse.save({ validateBeforeSave: false });

  res.json({ success: true, data: purchasedCourse });
});

const updateContentProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { contentId, progress = 0, durationWatched = 0 } = req.body;
  const userId = req.user.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchasedCourse = await PurchasedCourse.findOne({
      _id: id,
      user: userId,
      isActive: true
    }).session(session);

    if (!purchasedCourse || purchasedCourse.isExpired) {
      await session.abortTransaction();
      session.endSession();
      res.status(403);
      throw new Error('No active access to this course');
    }

    // Validate content belongs to course
    const content = await Content.findOne({
      _id: contentId,
      course: purchasedCourse.course,
      status: 'published'
    }).session(session);

    if (!content) {
      await session.abortTransaction();
      session.endSession();
      res.status(404);
      throw new Error('Content not found or not published');
    }

    // Update recentLessons
    const recent = purchasedCourse.recentLessons.find(r => r.lesson.toString() === contentId);
    if (recent) {
      recent.progress = Math.max(recent.progress, progress);
      recent.durationWatched += durationWatched;
    } else {
      purchasedCourse.recentLessons.push({
        lesson: contentId,
        progress,
        durationWatched
      });
    }

    // Mark as completed if progress >= 95% (to account for rounding)
    if (progress >= 95) {
      const isAlreadyCompleted = purchasedCourse.progress.completedLessons.some(
        c => c.lesson.toString() === contentId
      );
      if (!isAlreadyCompleted) {
        purchasedCourse.progress.completedLessons.push({
          lesson: contentId,
          completedAt: new Date()
        });
      }
    }

    // Recalculate weighted progress
    const completedIds = purchasedCourse.progress.completedLessons.map(c => c.lesson.toString());
    const newPercentage = await calculateWeightedProgress(completedIds, purchasedCourse.course);
    purchasedCourse.progress.percentage = newPercentage;

    // Update totalTimeSpent
    purchasedCourse.totalTimeSpent += durationWatched;

    // Check full completion (100%)
    if (newPercentage >= 100 && !purchasedCourse.isCompleted) {
      purchasedCourse.isCompleted = true;
      purchasedCourse.completedAt = new Date();
    }

    await purchasedCourse.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Populate for response
    await purchasedCourse.populate([
      { path: 'progress.completedLessons.lesson', select: 'title slug __t' },
      { path: 'recentLessons.lesson', select: 'title slug __t' }
    ]);

    res.json({ success: true, data: purchasedCourse });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

const getNextContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const purchasedCourse = await PurchasedCourse.findById(id);
  if (!purchasedCourse || purchasedCourse.user.toString() !== userId) {
    res.status(404);
    throw new Error('Enrollment not found');
  }

  if (purchasedCourse.isCompleted) {
    return res.json({ success: true, data: { message: 'Course completed!', next: null } });
  }

  // Get all published content in course, ordered
  const allContent = await Content.find({ course: purchasedCourse.course, status: 'published' })
    .sort({ order: 1, createdAt: 1 })
    .select('title slug order __t duration');

  const completedIds = new Set(
    purchasedCourse.progress.completedLessons.map(c => c.lesson.toString())
  );

  // Find first incomplete
  const next = allContent.find(c => !completedIds.has(c._id.toString())) || null;

  res.json({
    success: true,
    data: {
      progress: purchasedCourse.progress.percentage,
      next,
      completedCount: completedIds.size,
      totalCount: allContent.length
    }
  });
});

export {
  enrollInCourse,
  getUserPurchasedCourses,
  getPurchasedCourseById,
  updateContentProgress,
  getNextContent
};