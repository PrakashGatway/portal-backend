import TestSeries from '../../models/Test series/TestSeries.js';
import Exam from '../../models/Test series/Exams.js';
import { Section } from '../../models/Test series/Sections.js';
import Category from '../../models/Category.js';
import { Question } from '../../models/Test series/Questions.js';

export const getTestSeries = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            examId,
            type,
            isPaid,
            difficultyLevel,
            isActive,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = req.query;

        const matchStage = {};
        if (examId) matchStage.examId = examId;
        if (type) matchStage.type = type;
        if (isPaid !== undefined) matchStage.isPaid = isPaid === 'true';
        if (difficultyLevel) matchStage.difficultyLevel = difficultyLevel;
        if (isActive !== undefined) matchStage.isActive = isActive === 'true';
        if (search) {
            matchStage.title = { $regex: search, $options: 'i' };
        }

        const sortStage = {};
        sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam',
                },
            },
            { $unwind: { path: '$exam', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseAccess',
                    foreignField: '_id',
                    as: 'courses',
                },
            },
            {
                $addFields: {
                    totalSections: { $size: '$sections' },
                    totalQuestions: { $sum: '$sections.totalQuestions' },
                },
            },
            { $sort: sortStage },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        { $skip: (Number(page) - 1) * Number(limit) },
                        { $limit: Number(limit) },
                        {
                            $lookup: {
                                from: 'sections',
                                localField: 'sections.sectionId',
                                foreignField: '_id',
                                as: 'populatedSections',
                            },
                        },
                        {
                            $addFields: {
                                sections: {
                                    $map: {
                                        input: '$sections',
                                        as: 'sec',
                                        in: {
                                            sectionId: '$$sec.sectionId',
                                            order: '$$sec.order',
                                            duration: '$$sec.duration',
                                            totalQuestions: '$$sec.totalQuestions',
                                            questionIds: '$$sec.questionIds',
                                            sectionDetails: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: '$populatedSections',
                                                            cond: { $eq: ['$$this._id', '$$sec.sectionId'] },
                                                        },
                                                    },
                                                    0,
                                                ],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        { $project: { populatedSections: 0 } },
                    ],
                },
            },
            {
                $project: {
                    total: { $arrayElemAt: ['$metadata.total', 0] },
                    data: 1,
                },
            },
        ];

        const result = await TestSeries.aggregate(pipeline);
        const { total = 0, data = [] } = result[0] || {};

        res.status(200).json({
            success: true,
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching test series:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getTestSeriesById = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);

        const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };
        const testSeries = await TestSeries.findOne(query)
            .populate('examId', 'name examType')
            .populate('courseAccess', 'title')
            .lean();

        if (!testSeries) {
            return res.status(404).json({ success: false, message: 'Test series not found' });
        }

        // Populate sections and questions manually for control
        const populatedSections = await Promise.all(
            testSeries.sections.map(async (sec) => {
                const sectionDoc = await Section.findById(sec.sectionId).select('name description').lean();
                const questions = await Question.find({ _id: { $in: sec.questionIds } })
                    .select('questionText questionType')
                    .lean();
                return {
                    ...sec,
                    sectionDetails: sectionDoc || null,
                    questions,
                };
            })
        );

        res.status(200).json({
            success: true,
            data: { ...testSeries, sections: populatedSections },
        });
    } catch (error) {
        console.error('Error fetching test series:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
function createSlug(title = "") {
  return title
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
export const createTestSeries = async (req, res) => {
    try {
        const { title, type, examId, sections, slug: inputSlug, ...rest } = req.body;

        const exam = await Exam.findById(examId);
        if (!exam) return res.status(400).json({ success: false, message: 'Invalid examId' });

        for (const sec of sections) {
            const sectionExists = await Section.findById(sec.sectionId);
            if (!sectionExists) {
                return res.status(400).json({ success: false, message: `Invalid sectionId: ${sec.sectionId}` });
            }
            const validQuestions = await Question.countDocuments({
                _id: { $in: sec.questionIds },
            });
            if (validQuestions !== sec.questionIds.length) {
                return res.status(400).json({ success: false, message: 'One or more invalid question IDs' });
            }
        }

        const slug = createSlug(title)

        const testSeries = await TestSeries.create({
            title,
            type,
            examId,
            sections,
            slug,
            ...rest,
        });

        res.status(201).json({ success: true, data: testSeries });
    } catch (error) {
        console.error('Error creating test series:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Slug already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const updateTestSeries = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, slug: inputSlug, sections, examId, ...rest } = req.body;

        const existing = await TestSeries.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Test series not found' });
        }

        // Validate exam
        if (examId) {
            const exam = await Exam.findById(examId);
            if (!exam) return res.status(400).json({ success: false, message: 'Invalid examId' });
        }

        // Validate sections
        if (sections) {
            for (const sec of sections) {
                const sectionExists = await Section.findById(sec.sectionId);
                if (!sectionExists) {
                    return res.status(400).json({ success: false, message: `Invalid sectionId: ${sec.sectionId}` });
                }
                const validQuestions = await Question.countDocuments({
                    _id: { $in: sec.questionIds },
                });
                if (validQuestions !== sec.questionIds.length) {
                    return res.status(400).json({ success: false, message: 'Invalid question IDs in section' });
                }
            }
        }

        const slug = inputSlug
            ? await generateUniqueSlug(inputSlug, id)
            : title && title !== existing.title
                ? await generateUniqueSlug(title, id)
                : existing.slug;

        const updated = await TestSeries.findByIdAndUpdate(
            id,
            { ...req.body, slug },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating test series:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Slug already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const toggleActive = async (req, res) => {
    try {
        const { id } = req.params;
        const testSeries = await TestSeries.findById(id);
        if (!testSeries) {
            return res.status(404).json({ success: false, message: 'Test series not found' });
        }
        testSeries.isActive = !testSeries.isActive;
        await testSeries.save();
        res.status(200).json({
            success: true,
            message: `Test series is now ${testSeries.isActive ? 'active' : 'inactive'}`,
            data: { id: testSeries._id, isActive: testSeries.isActive },
        });
    } catch (error) {
        console.error('Error toggling active status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const deleteTestSeries = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TestSeries.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Test series not found' });
        }
        res.status(200).json({ success: true, message: 'Test series deleted permanently' });
    } catch (error) {
        console.error('Error deleting test series:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};