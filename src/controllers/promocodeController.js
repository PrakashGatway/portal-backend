import PromoCode from '../models/PromoCode.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Category from '../models/Category.js';

export const getAllPromoCodes = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            sort = '-createdAt', 
            search = '', 
            isActive, 
            type, 
            course, 
            category,
            validFrom,
            validUntil,
            isFeatured,
            usageLimit
        } = req.query;
        
        let filter = {};
        
        // Search filter
        if (search) {
            filter.$or = [
                { code: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Status filter
        if (isActive) {
            filter.isActive = isActive === 'true';
        }
        
        // Type filter
        if (type) {
            filter.type = type;
        }
        if (course) {
            filter.courses = course;
        }
        if (category) {
            filter.categories = category;
        }
        if (isFeatured !== undefined) {
            filter.isFeatured = isFeatured === 'true';
        }
        if (usageLimit !== undefined) {
            filter.usageLimit = parseInt(usageLimit);
        }
        if (validFrom) {
            filter.validFrom = { ...filter.validFrom, $gte: new Date(validFrom) };
        }
        if (validUntil) {
            filter.validUntil = { ...filter.validUntil, $lte: new Date(validUntil) };
        }
        
        // Combine date range filters if both exist
        if (validFrom && validUntil) {
            filter.validFrom = { $gte: new Date(validFrom) };
            filter.validUntil = { $lte: new Date(validUntil) };
        } else if (validFrom) {
            filter.validFrom = { $gte: new Date(validFrom) };
        } else if (validUntil) {
            filter.validUntil = { $lte: new Date(validUntil) };
        }
        
        const skip = (page - 1) * limit;
        
        const promoCodes = await PromoCode.find(filter)
            .populate('createdBy', 'name email')
            .populate('courses', 'title')
            .populate('categories', 'name')
            .populate('applicableUsers', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));
        
        // Get total count
        const total = await PromoCode.countDocuments(filter);
        
        res.status(200).json({
            success: true,
            data: promoCodes,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching promo codes:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching promo codes',
            error: error.message
        });
    }
};

export const getPromoCodeById = async (req, res) => {
    try {
        const promoCode = await PromoCode.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('courses', 'title')
            .populate('categories', 'name')
            .populate('applicableUsers', 'name email');
        
        if (!promoCode) {
            return res.status(404).json({
                success: false,
                message: 'Promo code not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: promoCode
        });
    } catch (error) {
        console.error('Error fetching promo code:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching promo code',
            error: error.message
        });
    }
};

export const createPromoCode = async (req, res) => {
    try {
        
        const existingCode = await PromoCode.findOne({ code: req.body.code.toUpperCase() });
        if (existingCode) {
            return res.status(400).json({
                success: false,
                message: 'Promo code already exists'
            });
        }
        
        const promoCode = new PromoCode({
            ...req.body,
            code: req.body.code.toUpperCase(),
            createdBy: req.user.id
        });
        
        await promoCode.save();
        
        res.status(201).json({
            success: true,
            message: 'Promo code created successfully',
            data: promoCode
        });
    } catch (error) {
        console.error('Error creating promo code:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating promo code',
            error: error.message
        });
    }
};

export const updatePromoCode = async (req, res) => {
    try {
        
        const promoCode = await PromoCode.findById(req.params.id);
        if (!promoCode) {
            return res.status(404).json({
                success: false,
                message: 'Promo code not found'
            });
        }
        
        if (req.body.code && req.body.code.toUpperCase() !== promoCode.code) {
            const existingCode = await PromoCode.findOne({ 
                code: req.body.code.toUpperCase(),
                _id: { $ne: req.params.id }
            });
            if (existingCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Promo code already exists'
                });
            }
        }
        
        Object.assign(promoCode, {
            ...req.body,
            code: req.body.code ? req.body.code.toUpperCase() : promoCode.code
        });
        
        await promoCode.save();
        
        res.status(200).json({
            success: true,
            message: 'Promo code updated successfully',
            data: promoCode
        });
    } catch (error) {
        console.error('Error updating promo code:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating promo code',
            error: error.message
        });
    }
};

export const deletePromoCode = async (req, res) => {
    try {
        const promoCode = await PromoCode.findById(req.params.id);
        if (!promoCode) {
            return res.status(404).json({
                success: false,
                message: 'Promo code not found'
            });
        }
        
        await PromoCode.findByIdAndDelete(req.params.id);
        
        res.status(200).json({
            success: true,
            message: 'Promo code deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting promo code:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting promo code',
            error: error.message
        });
    }
};

export const applyPromoCode = async (req, res) => {
    try {
        const { code, userId, courseId, amount } = req.body;
        
        // Validate promo code
        const promoCode = await PromoCode.findOne({
            code: code.toUpperCase(),
            isActive: true,
            validFrom: { $lte: new Date() },
            validUntil: { $gte: new Date() }
        });
        
        if (!promoCode) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired promo code'
            });
        }
        let discount = 0;
        if (promoCode.discountType === 'percentage') {
            discount = (amount * promoCode.discountValue) / 100;
            if (promoCode.maxDiscount && discount > promoCode.maxDiscount) {
                discount = promoCode.maxDiscount;
            }
        } else {
            discount = promoCode.discountValue;
        }
        
        if (discount > amount) {
            discount = amount;
        }
        
        promoCode.usedCount += 1;
        if (userId) {
            promoCode.usedBy.push({
                user: userId,
                usedAt: new Date()
            });
        }
        await promoCode.save();
        
        res.status(200).json({
            success: true,
            discount,
            finalAmount: amount - discount,
            data: promoCode
        });
    } catch (error) {
        console.error('Error applying promo code:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while applying promo code',
            error: error.message
        });
    }
};

export const validatePromoCode = async (req, res) => {
  try {
    const { code, courseId, currentPrice } = req.body;
    const userId = req.user._id;

    if (!code || !courseId || currentPrice === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const promo = await PromoCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    });

    if (!promo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired promo code' 
      });
    }

    // Check usage limit
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ 
        success: false, 
        message: 'Promo code usage limit reached' 
      });
    }

    // Check per-user limit
    if (promo.maxUsesPerUser > 0) {
      const userUsage = await PromoCode.findOne({
        _id: promo._id,
        'applicableUsers': { $in: [userId] }
      });
      if (userUsage && userUsage.applicableUsers.length >= promo.maxUsesPerUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'You have reached the usage limit for this promo code' 
        });
      }
    }

    // Check min purchase
    if (currentPrice < promo.minPurchase) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum purchase of ₹${promo.minPurchase} required` 
      });
    }

    // Validate promo type
    if (promo.type === 'course_specific' || promo.type === 'user_course_specific') {
      if (!promo.courses.includes(courseId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'This promo code is not valid for this course' 
        });
      }
    }

    if (promo.type === 'category_specific') {
      const course = await Course.findById(courseId);
      if (!promo.categories.includes(course.category)) {
        return res.status(400).json({ 
          success: false, 
          message: 'This promo code is not valid for this course category' 
        });
      }
    }

    if (promo.type === 'user_specific' || promo.type === 'user_course_specific') {
      if (!promo.applicableUsers.includes(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'This promo code is not valid for your account' 
        });
      }
    }

    if (promo.applicableUserRoles && promo.applicableUserRoles.length > 0) {
      const user = await User.findById(userId);
      if (!promo.applicableUserRoles.includes(user.role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'This promo code is not valid for your user role' 
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = (currentPrice * promo.discountValue) / 100;
      if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
        discountAmount = promo.maxDiscount;
      }
    } else {
      discountAmount = promo.discountValue;
      if (discountAmount > currentPrice) {
        discountAmount = currentPrice;
      }
    }

    res.json({
      success: true,
      discountAmount,
      discountType: promo.discountType,
      message: promo.description
    });
  } catch (error) {
    console.error('Promo validation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};