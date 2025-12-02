import mongoose from 'mongoose';
import Exam from '../../models/Test series/Exams.js';
import { Section } from '../../models/Test series/Sections.js';
import Category from '../../models/Category.js';

export const getExams = async (req, res) => {
    try {
        const {
            category,
            examType,
            isActive,
            search,
            page = 1,
            limit = 10,
        } = req.query;

        const matchConditions = {};

        if (category) {
            matchConditions.category = category;
        }

        if (examType) {
            matchConditions.examType = examType;
        }

        if (isActive !== undefined) {
            matchConditions.isActive = isActive === 'true';
        }

        if (search) {
            matchConditions.name = { $regex: search, $options: 'i' };
        }
        const skip = (Number(page) - 1) * Number(limit);

        const pipeline = [
            { $match: matchConditions },
            { $skip: skip }, { $limit: Number(limit) },
            {
                $lookup: {
                    from: 'categories', // collection name of Category model
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                    pipeline: [{ $project: { name: 1 } }],
                },
            },
            {
                $unwind: { path: '$category', preserveNullAndEmptyArrays: true },
            },
            {
                $lookup: {
                    from: 'sections',
                    localField: 'sections',
                    foreignField: '_id',
                    as: 'sections',
                    pipeline: [{ $project: { name: 1, duration: 1 } }],
                }
            },
            {
                $sort: { createdAt: -1 },
            },
        ];

        const exams = await Exam.aggregate(pipeline);
        const total = await Exam.countDocuments(matchConditions);

        res.status(200).json({
            success: true,
            count: exams.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: exams,
        });
    } catch (error) {
        console.error('Error fetching exams:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getExamById = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id)
            .populate('category', 'name')
            .populate('sections', 'name description');

        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        console.error('Error fetching exam:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const createExam = async (req, res) => {
    try {
        const { category, name, description, examType, sections } = req.body;

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({ success: false, message: 'Invalid category ID' });
        }

        if (sections && sections.length > 0) {
            const sectionsExist = await Section.countDocuments({ _id: { $in: sections } });
            if (sectionsExist !== sections.length) {
                return res.status(400).json({ success: false, message: 'One or more invalid section IDs' });
            }
        }

        const exam = await Exam.create(req.body);

        res.status(201).json({ success: true, data: exam });
    } catch (error) {
        console.error('Error creating exam:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Duplicate exam name' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateExam = async (req, res) => {
    try {
        let exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        if (req.body.category) {
            const cat = await Category.findById(req.body.category);
            if (!cat) return res.status(400).json({ success: false, message: 'Invalid category' });
        }

        if (req.body.sections) {
            const secCount = await Section.countDocuments({ _id: { $in: req.body.sections } });
            if (secCount !== req.body.sections.length) {
                return res.status(400).json({ success: false, message: 'Invalid section IDs' });
            }
        }

        exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })
            .populate('category', 'name')
            .populate('sections', 'name description');

        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        console.error('Error updating exam:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const deleteExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }
        await Exam.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: 'Exam deactivated' });
    } catch (error) {
        console.error('Error deleting exam:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const toggleExamActive = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        exam.isActive = !exam.isActive;
        await exam.save();

        res.status(200).json({
            success: true,
            message: `Exam is now ${exam.isActive ? 'active' : 'inactive'}`,
            data: { id: exam._id, isActive: exam.isActive },
        });
    } catch (error) {
        console.error('Error toggling exam status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};