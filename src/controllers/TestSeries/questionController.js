import { Question } from '../../models/Test series/Questions.js';
import ErrorResponse from '../../utils/errorResponse.js';
import mongoose from 'mongoose';

const getAllQuestions = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            sectionId,
            questionType,
            difficulty,
            tag,
            isActive = 'true',
        } = req.query;

        const matchFilter = { isActive: isActive == 'true' };
        if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) matchFilter.sectionId = new mongoose.Types.ObjectId(sectionId);
        if (questionType) matchFilter.questionType = questionType;
        if (difficulty) matchFilter.difficulty = difficulty;
        if (tag) matchFilter.tags = { $in: [tag] };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const pipeline = [];

        pipeline.push({ $match: matchFilter });

        pipeline.push({
            $lookup: {
                from: 'sections',
                localField: 'sectionId',
                foreignField: '_id',
                as: 'section',
            },
        });
        pipeline.push({
            $unwind: { path: '$section', preserveNullAndEmptyArrays: true }
        });

        pipeline.push({
            $project: {
                _id: 1,
                sectionId: 1,
                title: 1,
                totalQuestions: 1,
                questionCategory: 1,
                exam: 1,
                marks: 1,
                questionType: 1,
                difficulty: 1,
                content: 1,
                cueCard: 1,
                options: 1,
                correctAnswer: 1,
                sampleAnswer: 1,
                explanation: 1,
                tags: 1,
                timeLimit: 1,
                isActive: 1,
                createdAt: 1,
                updatedAt: 1,
                questionGroup: 1,
                section: {
                    _id: '$section._id',
                    title: '$section.name'
                }
            }
        });

        pipeline.push({ $sort: { createdAt: -1 } });

        const countPipeline = [...pipeline.slice(0, pipeline.findIndex(stage => stage.$project))];
        countPipeline.push({ $count: 'total' });
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });

        const [questions, countResult] = await Promise.all([
            Question.aggregate(pipeline),
            Question.aggregate(countPipeline)
        ]);

        const total = countResult.length > 0 ? countResult[0].total : 0;

        res.status(200).json({
            success: true,
            results: questions.length,
            questions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        next(new ErrorResponse(err.message, 500));
    }
};


const getQuestion = async (req, res, next) => {
    const { id } = req.params;
    const question = await Question.findById(id)
        .populate('examId sectionId createdBy');

    if (!question) return next(new ErrorResponse('Question not found', 404));
    res.status(200).json({ success: true, question });
};

const createQuestion = async (req, res, next) => {
    try {
        const question = await Question.create({
            ...req.body,
            createdBy: req.user?.id,
        });
        res.status(201).json({ success: true, question });
    } catch (err) {
        console.log(err);
        next(new ErrorResponse(err.message, 400));
    }
};

const updateQuestion = async (req, res, next) => {
    const { id } = req.params;

    const question = await Question.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!question) return next(new ErrorResponse('Question not found', 404));
    res.status(200).json({ success: true, question });
};

const deleteQuestion = async (req, res, next) => {
    const { id } = req.params;
    const question = await Question.findByIdAndDelete(id);

    if (!question) return next(new ErrorResponse('Question not found', 404));
    res.status(200).json({ success: true, message: 'Question deactivated' });
};


export {
    getAllQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
};