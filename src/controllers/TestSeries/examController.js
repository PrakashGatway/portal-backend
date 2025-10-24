import mongoose from 'mongoose';
import Exam from '../../models/Test series/Exams.js';
import { Section } from '../../models/Test series/Sections.js';

export const createExam = async (req, res) => {
    try {
        const { category, name, description, examType, sections } = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(category)) {
            return res.status(400).json({ message: 'Invalid category ID' });
        }

        const exam = await Exam.create({
            category,
            name,
            description,
            examType,
            sections: sections || []
        });

        res.status(201).json(exam);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

export const updateExam = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const exam = await Exam.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        res.json(exam);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

export const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;

        const exam = await Exam.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        await Section.updateMany(
            { _id: { $in: exam.sections } },
            { isActive: false }
        );

        res.json({ message: 'Exam deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getExamById = async (req, res) => {
    try {
        const { id } = req.params;

        const exam = await Exam.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id), isActive: true } },
            {
                $lookup: {
                    from: 'sections',
                    localField: 'sections',
                    foreignField: '_id',
                    as: 'sections',
                    pipeline: [
                        { $match: { isActive: true } },
                        { $sort: { order: 1 } }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                    pipeline: [{ $project: { name: 1 } }]
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: 1,
                    description: 1,
                    examType: 1,
                    'category.name': 1,
                    sections: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]);

        if (!exam.length) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        res.json(exam[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getExams = async (req, res) => {
    const { page = 1, limit = 10, examType } = req.query;
    const skip = (page - 1) * limit;

    const matchStage = { isActive: true };
    if (examType) matchStage.examType = examType;

    try {
        const exams = await Exam.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                    pipeline: [{ $project: { name: 1 } }]
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: 1,
                    examType: 1,
                    'category.name': 1,
                    createdAt: 1
                }
            },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ]);

        const total = await Exam.countDocuments(matchStage);

        res.json({
            data: exams,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};