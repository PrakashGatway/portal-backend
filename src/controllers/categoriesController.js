import mongoose from 'mongoose';
import Category from '../models/Category.js';
import asyncHandler from '../middleware/async.js';

const getCategories = asyncHandler(async (req, res, next) => {
    const match = { isActive: true };
    if (req.query.search) {
        match.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } }
        ];
    }
    if (req.query.parent) {
        if (req.query.parent === 'null' || req.query.parent === 'root') {
            match.parent = { $exists: false };
        } else {
            match.parent = req.query.parent;
        }
    }
    if (req.query.isActive !== undefined) {
        match.isActive = req.query.isActive === 'true';
    }

    let sort = {};
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',');
        sortBy.forEach(field => {
            if (field.startsWith('-')) {
                sort[field.substring(1)] = -1;
            } else {
                sort[field] = 1;
            }
        });
    } else {
        sort = { order: 1, createdAt: -1 };
    }

    const pipeline = [
        { $match: match },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: 'parent',
                as: 'subcategories'
            }
        },
        {
            $lookup: {
                from: 'courses',
                localField: '_id',
                foreignField: 'category',
                as: 'courses'
            }
        },
        {
            $addFields: {
                subcategoriesCount: { $size: '$subcategories' },
                coursesCount: { $size: '$courses' }
            }
        },
        {
            $project: {
                subcategories: 0,
                courses: 0
            }
        },
        { $sort: sort }
    ];

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    pipeline.push({ $skip: startIndex });
    pipeline.push({ $limit: limit });
    const categories = await Category.aggregate(pipeline);
    const totalPipeline = [
        { $match: match },
        { $count: 'total' }
    ];
    const totalCount = await Category.aggregate(totalPipeline);
    const total = totalCount.length > 0 ? totalCount[0].total : 0;

    res.status(200).json({
        success: true,
        count: categories.length,
        total,
        data: categories
    });
});

const getCategory = asyncHandler(async (req, res, next) => {
    const pipeline = [
        {
            $match: {
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(req.params.id) ? new mongoose.Types.ObjectId(req.params.id) : null },
                    { slug: req.params.id }
                ]
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: 'parent',
                as: 'subcategories'
            }
        },
        {
            $lookup: {
                from: 'courses',
                localField: '_id',
                foreignField: 'category',
                as: 'courses'
            }
        },
        {
            $addFields: {
                subcategoriesCount: { $size: '$subcategories' },
                coursesCount: { $size: '$courses' }
            }
        },
        {
            $project: {
                __v: 0
            }
        }
    ];

    const categories = await Category.aggregate(pipeline);

    if (!categories || categories.length === 0) {
        return next();
    }

    res.status(200).json({
        success: true,
        data: categories[0]
    });
});

const createCategory = asyncHandler(async (req, res, next) => {
    const { name, description, parent, icon, color, order, isActive, slug } = req.body;

    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
        return res.status(400).json({
            success: false,
            message: 'Category with this name already exists'
        });
    }

    const category = await Category.create({
        name: name.trim(),
        description,
        slug,
        parent,
        icon,
        color,
        order,
        isActive
    });

    res.status(201).json({
        success: true,
        data: category
    });
});


const updateCategory = asyncHandler(async (req, res, next) => {
    let category = await Category.findById(req.params.id);

    if (!category) {
        return res.status(404).json({
            success: false,
            message: 'Category not found'
        });
    }

    const { name, description, parent, icon, color, order, slug:newSlug, isActive } = req.body;

    if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
            name: name.trim(),
            _id: { $ne: category._id }
        });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }
    }

    let slug = newSlug;

    // Update category
    const updateData = {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        slug,
        ...(parent !== undefined && { parent }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
    };

    category = await Category.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).json({
        success: true,
        data: category
    });
})


const deleteCategory = asyncHandler(async (req, res, next) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        return res.status(404).json({
            success: false,
            message: 'Category not found'
        });
    }

    const subcategories = await Category.find({ parent: category._id });
    if (subcategories.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Cannot delete category with subcategories. Delete subcategories first.'
        });
    }

    await category.remove();

    res.status(200).json({
        success: true,
        data: {}
    });
});


const getSubcategories = asyncHandler(async (req, res, next) => {
    const match = {
        isActive: true
    };

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        match.$or = [
            { parent: new mongoose.Types.ObjectId(req.params.id) },
            // { parent: { $exists: false } }
        ];
    } else {
        const category = await Category.findOne({ slug: req.params.id });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: `Category not found with slug of ${req.params.id}`
            });
        }
        match.parent = category._id;
    }

    const pipeline = [
        { $match: match },
        {
            $lookup: {
                from: 'courses',
                localField: '_id',
                foreignField: 'category',
                as: 'courses'
            }
        },
        {
            $addFields: {
                coursesCount: { $size: '$courses' }
            }
        },
        {
            $project: {
                courses: 0
            }
        },
        { $sort: { order: 1, createdAt: -1 } }
    ];

    const subcategories = await Category.aggregate(pipeline);

    res.status(200).json({
        success: true,
        count: subcategories.length,
        data: subcategories
    });
});


const getRootCategories = asyncHandler(async (req, res, next) => {
    const match = {
        parent: { $exists: false },
        isActive: true
    };

    // Add search filter
    if (req.query.search) {
        match.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    const pipeline = [
        { $match: match },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: 'parent',
                as: 'subcategories'
            }
        },
        {
            $lookup: {
                from: 'courses',
                localField: '_id',
                foreignField: 'category',
                as: 'courses'
            }
        },
        {
            $addFields: {
                subcategoriesCount: { $size: '$subcategories' },
                coursesCount: { $size: '$courses' }
            }
        },
        {
            $project: {
                subcategories: 0,
                courses: 0
            }
        },
        { $sort: { order: 1, createdAt: -1 } }
    ];

    // Add pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    pipeline.push({ $skip: startIndex });
    pipeline.push({ $limit: limit });

    const categories = await Category.aggregate(pipeline);

    // Get total count
    const totalPipeline = [
        { $match: match },
        { $count: 'total' }
    ];
    const totalCount = await Category.aggregate(totalPipeline);
    const total = totalCount.length > 0 ? totalCount[0].total : 0;

    res.status(200).json({
        success: true,
        count: categories.length,
        total,
        data: categories
    });
});

const getCategoryTree = asyncHandler(async (req, res, next) => {
    const pipeline = [
        {
            $match: {
                isActive: true
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: 'parent',
                as: 'children'
            }
        },
        {
            $lookup: {
                from: 'courses',
                localField: '_id',
                foreignField: 'category',
                as: 'courses'
            }
        },
        {
            $addFields: {
                childrenCount: { $size: '$children' },
                coursesCount: { $size: '$courses' }
            }
        },
        {
            $project: {
                children: 0,
                courses: 0
            }
        },
        { $sort: { order: 1, createdAt: -1 } }
    ];

    const allCategories = await Category.aggregate(pipeline);

    // Build tree structure
    const buildTree = (categories, parentId = null) => {
        return categories
            .filter(category => {
                if (parentId === null) {
                    return !category.parent;
                }
                return category.parent && category.parent.toString() === parentId.toString();
            })
            .map(category => {
                const children = buildTree(categories, category._id);
                return {
                    ...category,
                    children,
                    childrenCount: children.length
                };
            });
    };

    const tree = buildTree(allCategories);

    res.status(200).json({
        success: true,
        count: tree.length,
        data: tree
    });
});

export {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    getSubcategories,
    getRootCategories,
    getCategoryTree
};