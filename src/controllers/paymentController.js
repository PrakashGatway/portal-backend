import mongoose from 'mongoose';
import Transaction from '../models/Payment.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import PromoCode from '../models/PromoCode.js';
import { Wallet } from '../models/Wallet.js';

export const createPayment = async (req, res) => {
  let session = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const {
      courseId,
      promoCode,
      useWallet = false
    } = req.body;

    const userId = req.user._id;

    const course = await Course.findById(courseId).session(session);
    const wallet = await Wallet.findOne({ user: userId }).session(session);

    if (!course) {
      throw new Error('COURSE_NOT_FOUND');
    }
    if (!wallet) {
      throw new Error('WALLET_NOT_FOUND');
    }

    const originalAmount = course.pricing.originalAmount || course.pricing.amount;
    let currentPrice = originalAmount;
    let courseDiscount = 0;

    if (course.pricing.discount && course.pricing.discount > 0) {
      const discountAmt = (originalAmount * course.pricing.discount) / 100;
      currentPrice = originalAmount - discountAmt;
      courseDiscount = discountAmt;
    }

    let isEarlyBirdActive = false;
    if (course.pricing.earlyBird?.deadline) {
      const now = new Date();
      const deadline = new Date(course.pricing.earlyBird.deadline);
      if (now <= deadline) {
        isEarlyBirdActive = true;
        const earlyBirdDiscount = (currentPrice * course.pricing.earlyBird.discount) / 100;
        currentPrice -= earlyBirdDiscount;
        courseDiscount += earlyBirdDiscount;
      }
    }

    let promoDiscount = 0;
    let couponData = null;

    if (promoCode) {
      const promoDoc = await PromoCode.findOne({
        code: promoCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      }).session(session);

      if (!promoDoc) {
        throw new Error('INVALID_PROMO');
      }

      if (promoDoc.type === 'course_specific' && !promoDoc.courses.includes(courseId)) {
        throw new Error('PROMO_NOT_VALID_FOR_COURSE');
      }

      if (promoDoc.discountType === 'percentage') {
        promoDiscount = (currentPrice * promoDoc.discountValue) / 100;
        if (promoDoc.maxDiscount && promoDiscount > promoDoc.maxDiscount) {
          promoDiscount = promoDoc.maxDiscount;
        }
      } else {
        promoDiscount = promoDoc.discountValue;
        if (promoDiscount > currentPrice) promoDiscount = currentPrice;
      }

      currentPrice = Math.max(0, currentPrice - promoDiscount);
      couponData = {
        code: promoCode.toUpperCase(),
        discountType: promoDoc.discountType,
        discountValue: promoDoc.discountValue
      };
    }

    let creditsUsed = 0;
    if (useWallet && wallet.balance > 0) {
      const maxWalletUsage = currentPrice * 0.1; // 10%
      creditsUsed = Math.min(wallet.balance, maxWalletUsage);
      currentPrice = Math.max(0, currentPrice - creditsUsed);
    }

    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    const transaction = new Transaction({
      user: userId,
      course: courseId,
      type: 'purchase',
      amount: currentPrice,
      paymentMethod: creditsUsed > 0 ? 'bank' : 'bank',
      transactionId,
      status: 'pending',
      breakdown: {
        baseAmount: originalAmount,
        tax: 0,
        discount: courseDiscount + promoDiscount,
        platformFee: 0,
        creditsUsed,
        creditsEarned: 0
      },
      coupon: couponData,
      meta: { isEarlyBird: isEarlyBirdActive }
    });

    await transaction.save({ session });

    if (creditsUsed > 0) {
      wallet.balance -= creditsUsed;
      wallet.totalSpent += creditsUsed;
      await wallet.save({ session });
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      redirectUrl: '/payment-status',
      orderId: transactionId,
      amount: currentPrice,
      courseTitle: course.title,
      currency: course.pricing.currency || 'INR'
    });

  } catch (error) {
    if (session && session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.warn('Abort transaction failed:', abortError);
      }
    }

    if (error.message === 'COURSE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    if (error.message === 'WALLET_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Wallet not found. Please contact support.' });
    }
    if (error.message === 'INVALID_PROMO') {
      return res.status(400).json({ success: false, message: 'Invalid or expired promo code' });
    }
    if (error.message === 'PROMO_NOT_VALID_FOR_COURSE') {
      return res.status(400).json({ success: false, message: 'This promo is not valid for this course' });
    }

    console.error('Payment creation error:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const getUserTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, queryUserId, search } = req.query;
    const currentUser = req.user;

    const filter = [];

    // ✅ Role-based filter
    if (currentUser.role === "admin") {
      if (queryUserId) {
        filter.push({ user: new mongoose.Types.ObjectId(queryUserId) });
      }
    } else {
      filter.push({ user: new mongoose.Types.ObjectId(currentUser._id) });
    }

    // ✅ Type filter
    if (type) filter.push({ type });

    // ✅ Status filter
    if (status) filter.push({ status });

    // ✅ Search filter (case-insensitive regex)
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.push({
        $or: [
          { transactionId: regex },
          { orderId: regex },
          { invoiceNumber: regex },
          { "coupon.code": regex }
        ]
      });
    }

    // ✅ Build pipeline
    const pipeline = [
      { $match: filter.length ? { $and: filter } : {} },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          user: 1,
          course: { _id: 1, title: 1 },
          type: 1,
          amount: 1,
          paymentMethod: 1,
          breakdown: 1,
          transactionId: 1,
          orderId: 1,
          invoiceNumber: 1,
          status: 1,
          createdAt: 1,
          coupon: 1
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
          ],
          totalCount: [{ $count: "count" }]
        }
      }
    ];

    const result = await Transaction.aggregate(pipeline);

    const transactions = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAdminTransactions = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      page = 1,
      limit = 10,
      type,
      status,
      userId, // filter by specific user
      search,
      fromDate,
      toDate
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Build filter
    const filter = [];

    // User filter (optional)
    if (userId) {
      filter.push({ user: new mongoose.Types.ObjectId(userId) });
    }

    // Type & status
    if (type) filter.push({ type });
    if (status) filter.push({ status });

    // Date range
    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate);
      if (toDate) dateFilter.$lte = new Date(toDate);
      filter.push({ createdAt: dateFilter });
    }

    // Search
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.push({
        $or: [
          { transactionId: regex },
          { orderId: regex },
          { invoiceNumber: regex },
          { 'coupon.code': regex }
        ]
      });
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: filter.length ? { $and: filter } : {} },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          user: { _id: 1, name: 1, email: 1 },
          course: { _id: 1, title: 1 },
          type: 1,
          amount: 1,
          paymentMethod: 1,
          breakdown: 1,
          transactionId: 1,
          orderId: 1,
          invoiceNumber: 1,
          status: 1,
          createdAt: 1,
          coupon: 1,
          refund: 1
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
          ],
          totalCount: [{ $count: 'count' }]
        }
      }
    ];

    const result = await Transaction.aggregate(pipeline);
    const transactions = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    const statsPipeline = [
      { $match: filter.length ? { $and: filter } : {} },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "success"] },
                    { $in: ["$type", ["purchase", "course_purchase", "subscription"]] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          totalRefunds: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "refund"] },
                    { $in: ["$type", ["refund", "referral_bonus", "discount", "purchase_bonus"]] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          transactionCount: { $sum: 1 },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $in: ['$status', ['failed', 'cancelled']] }, 1, 0] } }
        }
      }
    ];

    const statsResult = await Transaction.aggregate(statsPipeline);
    const stats = statsResult[0] || {
      totalRevenue: 0,
      totalRefunds: 0,
      transactionCount: 0,
      successCount: 0,
      pendingCount: 0,
      failedCount: 0
    };

    return res.json({
      success: true,
      data: transactions,
      stats: {
        totalRevenue: stats.totalRevenue,
        totalRefunds: stats.totalRefunds,
        netRevenue: stats.totalRevenue - stats.totalRefunds,
        transactionCount: stats.transactionCount,
        successCount: stats.successCount,
        pendingCount: stats.pendingCount,
        failedCount: stats.failedCount
      },
      pagination: {
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Admin transactions error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const getTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
    }

    const transaction = await Transaction.findOne({ _id: id, user: userId })
      .populate('course', 'title')
      .populate('user','name email')
      .lean();

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateTransactionStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status, orderId, invoiceNumber, receiptUrl, reason } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
    }

    const allowedStatuses = ['pending', 'success', 'failed', 'refunded', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const transaction = await Transaction.findById(id).session(session);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Only allow user to update their own transactions or admin
    if (transaction.user.toString() !== userId.toString()) {
      // Add admin check if you have roles
      // if (req.user.role !== 'admin') {
      //   return res.status(403).json({ success: false, message: 'Not authorized' });
      // }
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update fields
    transaction.status = status;
    if (orderId) transaction.orderId = orderId;
    if (invoiceNumber) transaction.invoiceNumber = invoiceNumber;
    if (receiptUrl) transaction.receiptUrl = receiptUrl;
    if (reason) transaction.reason = reason;

    // Handle refund logic
    if (status === 'refunded') {
      transaction.refund = {
        isRefunded: true,
        refundId: `REF_${Date.now()}`,
        refundAmount: transaction.amount,
        refundDate: new Date(),
        reason: reason || 'Refunded by user request'
      };
    }

    await transaction.save({ session });

    // If successful payment, add credits earned to user wallet
    if (status === 'success' && transaction.breakdown.creditsEarned > 0) {
      const user = await User.findById(transaction.user).session(session);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + transaction.breakdown.creditsEarned;
        await user.save({ session });
      }
    }

    // If refunded and was wallet payment, refund to wallet
    if (status === 'refunded' && transaction.paymentMethod === 'wallet') {
      const user = await User.findById(transaction.user).session(session);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + transaction.amount;
        await user.save({ session });
      }
    }

    await session.commitTransaction();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('course', 'title')
      .lean();

    res.json({
      success: true,
      data: populatedTransaction,
      message: 'Transaction status updated successfully'
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Update transaction status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    session.endSession();
  }
};

// @desc    Process refund
// @route   POST /api/transactions/:id/refund
// @access  Private
export const processRefund = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { refundAmount, reason } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
    }

    const transaction = await Transaction.findById(id).session(session);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (transaction.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Only successful transactions can be refunded' });
    }

    if (transaction.refund?.isRefunded) {
      return res.status(400).json({ success: false, message: 'Transaction already refunded' });
    }

    const maxRefund = transaction.amount;
    if (refundAmount > maxRefund) {
      return res.status(400).json({ success: false, message: `Maximum refund amount is ${maxRefund}` });
    }

    // Update transaction
    transaction.status = 'refunded';
    transaction.refund = {
      isRefunded: true,
      refundId: `REF_${Date.now()}`,
      refundAmount: refundAmount || maxRefund,
      refundDate: new Date(),
      reason: reason || 'Refund requested by user'
    };

    await transaction.save({ session });

    // Refund to original payment method
    if (transaction.paymentMethod === 'wallet') {
      const user = await User.findById(transaction.user).session(session);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + (refundAmount || maxRefund);
        await user.save({ session });
      }
    }
    // For bank payments, you'd integrate with your payment gateway here

    await session.commitTransaction();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('course', 'title')
      .lean();

    res.json({
      success: true,
      data: populatedTransaction,
      message: 'Refund processed successfully'
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Process refund error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    session.endSession();
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
export const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalSpent: { $sum: '$amount' },
          successfulTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'success'] }, 1, 0]
            }
          },
          byType: {
            $push: {
              type: '$type',
              amount: '$amount',
              status: '$status'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalTransactions: 1,
          totalSpent: 1,
          successfulTransactions: 1,
          successRate: {
            $cond: {
              if: { $gt: ['$totalTransactions', 0] },
              then: { $multiply: [{ $divide: ['$successfulTransactions', '$totalTransactions'] }, 100] },
              else: 0
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalTransactions: 0,
        totalSpent: 0,
        successfulTransactions: 0,
        successRate: 0
      }
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};