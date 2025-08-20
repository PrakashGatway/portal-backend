import Page from '../models/PagesContent.js';
import mongoose from 'mongoose';

// Create a new page
export const createPage = async (req, res) => {
    try {
        const page = new Page(req.body);
        await page.save();
        res.status(201).json({
            success: true,
            data: page,
            message: 'Page created successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all pages with advanced filtering
export const getPages = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt',
            fields,
            search,
            status,
            pageType
        } = req.query;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (pageType) {
            filter.pageType = Array.isArray(pageType) 
                ? { $in: pageType } 
                : pageType;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { subTitle: { $regex: search, $options: 'i' } },
                { metaDescription: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        const pipeline = [
            { $match: filter },
        ];

        const sortObj = {};
        if (sort) {
            const sortFields = sort.split(',');
            sortFields.forEach(field => {
                if (field.startsWith('-')) {
                    sortObj[field.substring(1)] = -1;
                } else {
                    sortObj[field] = 1;
                }
            });
        }
        pipeline.push({ $sort: sortObj });

        if (fields) {
            const selectFields = {};
            fields.split(',').forEach(field => {
                if (field.startsWith('-')) {
                    selectFields[field.substring(1)] = 0;
                } else {
                    selectFields[field] = 1;
                }
            });
            pipeline.push({ $project: selectFields });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });

        const pages = await Page.aggregate(pipeline);

        // Get total count for pagination info
        const countPipeline = [
            { $match: filter },
            { $count: "total" }
        ];
        const totalResult = await Page.aggregate(countPipeline);
        const total = totalResult[0]?.total || 0;

        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            data: pages,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: total,
                itemsPerPage: parseInt(limit),
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get page by ID
export const getPageById = async (req, res) => {
    try {
        const { id } = req.params;
        const { populate } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid page ID'
            });
        }

        let query = Page.findById(id);
        
        if (populate) {
            // Add any population logic here if needed
            // query = query.populate(populate);
        }

        const page = await query.exec();

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        res.json({
            success: true,
            data: page
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getPageBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const page = await Page.findOne({ slug });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        res.json({
            success: true,
            data: page
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updatePage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid page ID'
            });
        }

        const page = await Page.findByIdAndUpdate(
            id, 
            req.body, 
            { 
                new: true, 
                runValidators: true 
            }
        );

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        res.json({
            success: true,
            data: page,
            message: 'Page updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deletePage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid page ID'
            });
        }

        const page = await Page.findByIdAndDelete(id);

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        res.json({
            success: true,
            message: 'Page deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};