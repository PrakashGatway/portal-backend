import Exam from "../../models/Test series/Exams.js";
import { Section } from "../../models/Test series/Sections.js";

export const createSection = async (req, res) => {
    try {
        const { name, description, instructions, thumbnailPic, duration, totalQuestions } = req.body;

        const section = new Section({
            name,
            description,
            instructions,
            thumbnailPic,
            duration,
            totalQuestions,
        });

        const savedSection = await section.save();
        res.status(201).json(savedSection);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getSections = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = 'order',
            sortOrder = 'asc',
            isActive,
            search,
        } = req.query;

        const matchStage = {};

        if (isActive !== undefined) {
            matchStage.isActive = isActive === 'true';
        }

        if (search) {
            const searchRegex = new RegExp(search.trim(), 'i');
            matchStage.$or = [
                { name: searchRegex },
                { description: searchRegex },
                { instructions: searchRegex },
            ];
        }

        const validSortFields = ['name', 'order', 'duration', 'totalQuestions', 'createdAt'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'order';
        const sortValue = sortOrder === 'desc' ? -1 : 1;
        const sortStage = { [sortField]: sortValue };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const pipeline = [
            { $match: matchStage },
            { $sort: sortStage },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: take }],
                    totalCount: [{ $count: 'count' }],
                },
            },
            {
                $project: {
                    data: 1,
                    total: { $arrayElemAt: ['$totalCount.count', 0] },
                },
            },
        ];

        const result = await Section.aggregate(pipeline);
        const { data = [], total = 0 } = result[0] || {};

        return res.json({
            success: true,
            data,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / take),
        });
    } catch (error) {
        console.error('Aggregation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch sections',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

export const getSectionById = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }
        res.json(section);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSection = async (req, res) => {
    try {
        const { name, description, instructions, thumbnailPic, duration, totalQuestions, isActive } = req.body;

        const section = await Section.findByIdAndUpdate(
            req.params.id,
            { name, description, instructions, thumbnailPic, duration, totalQuestions, isActive },
            { new: true, runValidators: true }
        );

        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }

        res.json(section);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
export const deleteSection = async (req, res) => {
    try {
        // Option 1: Soft delete (recommended)
        // const section = await Section.findByIdAndUpdate(
        //   req.params.id,
        //   { isActive: false },
        //   { new: true }
        // );

        // Option 2: Hard delete (uncomment if preferred)
        const section = await Section.findByIdAndDelete(req.params.id);

        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }

        res.json({ message: 'Section deleted successfully', section });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};