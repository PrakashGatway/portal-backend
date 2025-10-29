import User from '../models/User.js';
import Course from '../models/Course.js';
import { Wallet } from '../models/Wallet.js';

export const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { role, search, isActive, isVerified, subscriptionType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'email', 'role', 'lastActive'];
    const sortKey = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const pipeline = [];

    const matchStage = {};

    if (role) matchStage.role = role;
    if (isActive) matchStage.isActive = isActive === 'true' ? true : false;
    if (isVerified !== undefined) matchStage.isVerified = isVerified === 'true';
    if (subscriptionType) matchStage['subscription.type'] = subscriptionType;

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { 'profile.bio': { $regex: search, $options: 'i' } }
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push({
      $project: {
        refreshTokens: 0,
        __v: 0
      }
    });
    pipeline.push({
      $project: {
        name: 1,
        email: 1,
        role: 1,
        phoneNumber: 1,
        address: 1,
        profile: 1,
        subscription: 1,
        achievements: 1,
        lastActive: 1,
        isVerified: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        fullAddress: {
          $cond: {
            if: '$address',
            then: {
              $concat: [
                { $ifNull: ['$address.street', ''] },
                ' ',
                { $ifNull: ['$address.city', ''] },
                ', ',
                { $ifNull: ['$address.state', ''] },
                ', ',
                { $ifNull: ['$address.country', ''] },
                ' ',
                { $ifNull: ['$address.zipCode', ''] }
              ]
            },
            else: ''
          }
        }
      }
    });

    pipeline.push({ $sort: { [sortKey]: sortDirection } });

    const totalCountPipeline = [...pipeline, { $count: 'total' }];
    const totalCountResult = await User.aggregate(totalCountPipeline).exec();
    const total = totalCountResult[0]?.total || 0;
    const pages = Math.ceil(total / limit);

    const finalPipeline = [
      ...pipeline,
      { $skip: skip },
      { $limit: limit }
    ];

    const users = await User.aggregate(finalPipeline).exec();

    return res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total
      }
    });

  } catch (error) {
    console.error('Error in getUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.user.id !== req.params.id &&
      req.user.role !== 'admin' &&
      req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this profile'
      });
    }

    const wallet = await Wallet.findOne({ user: req.params.id }, 'balance totalEarned totalSpent totalReferrals referralEarnings').lean();

    res.json({
      success: true,
      data: user,
      wallet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id &&
      req.user.role !== 'admin' &&
      req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const updateData = { ...req.body };

    delete updateData.refreshTokens;

    if (updateData.role && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      delete updateData.role;
    }
    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).select('-refreshTokens');

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

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;              // User ID from URL
    const { isActive } = req.body;          // New status from request body

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }
    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true } // return updated user
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

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