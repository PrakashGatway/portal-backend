import PromoCode from '../models/PromoCode.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Category from '../models/Category.js';

export const getAllPromoCodes = async (req, res) => {
    try {
        const { page = 1, limit = 10, sort = '-createdAt', search = '', isActive, type, course, category } = req.query;
        
        let filter = {};
        
        if (search) {
            filter.$or = [
                { code: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (isActive ) {
            filter.isActive = isActive === 'true';
        }
        
        if (type) {
            filter.type = type;
        }
        
        if (course) {
            filter.courses = course;
        }
        
        if (category) {
            filter.categories = category;
        }
        
        const skip = (page - 1) * limit;
        
        // Get promo codes with pagination
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

export const validatePromoCode = async (req, res) => {
    try {
        const { code, userId, courseId } = req.body;
        
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
        
        // Check usage limits
        if (promoCode.usageLimit > 0 && promoCode.usedCount >= promoCode.usageLimit) {
            return res.status(400).json({
                success: false,
                message: 'Promo code usage limit exceeded'
            });
        }
        
        // Check user-specific restrictions
        if (promoCode.applicableUsers && promoCode.applicableUsers.length > 0) {
            if (!userId || !promoCode.applicableUsers.includes(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Promo code not applicable to this user'
                });
            }
        }
        
        // Check course-specific restrictions
        if (promoCode.type === 'course_specific' && courseId) {
            if (!promoCode.courses.includes(courseId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Promo code not applicable to this course'
                });
            }
        }
        
        // Check user-course-specific restrictions
        if (promoCode.type === 'user_course_specific' && userId && courseId) {
            if (!promoCode.applicableUsers.includes(userId) || 
                !promoCode.courses.includes(courseId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Promo code not applicable to this user or course'
                });
            }
        }
        
        // Check per-user usage limit
        if (userId && promoCode.maxUsesPerUser > 0) {
            const userUsageCount = promoCode.usedBy.filter(usage => 
                usage.user.toString() === userId
            ).length;
            if (userUsageCount >= promoCode.maxUsesPerUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Promo code usage limit exceeded for this user'
                });
            }
        }
        
        res.status(200).json({
            success: true,
            data: promoCode
        });
    } catch (error) {
        console.error('Error validating promo code:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while validating promo code',
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
        
        // Calculate discount
        let discount = 0;
        if (promoCode.discountType === 'percentage') {
            discount = (amount * promoCode.discountValue) / 100;
            if (promoCode.maxDiscount && discount > promoCode.maxDiscount) {
                discount = promoCode.maxDiscount;
            }
        } else {
            discount = promoCode.discountValue;
        }
        
        // Ensure discount doesn't exceed amount
        if (discount > amount) {
            discount = amount;
        }
        
        // Update usage count
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