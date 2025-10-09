import { Lead } from '../models/Leads.js';
import mongoose from 'mongoose';

const parseDateRange = (dateStr) => {
    if (!dateStr) return null;
    const [start, end] = dateStr.split('_');
    return {
        $gte: start ? new Date(start) : undefined,
        $lte: end ? new Date(end) : undefined
    };
};

export const getAllLeads = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt',
            search,
            status,
            source,
            assignedCounselor,
            coursePreference,
            countryOfResidence,
            intakeDateRange // format: "YYYY-MM-DD_YYYY-MM-DD"
        } = req.query;

        const matchStage = {};

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            matchStage.$or = [
                { fullName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex }
            ];
        }

        if (status) matchStage.status = status;
        if (source) matchStage.source = source;
        if (coursePreference) matchStage.coursePreference = coursePreference;
        if (countryOfResidence) matchStage.countryOfResidence = countryOfResidence;

        if (assignedCounselor) {
            if (!mongoose.Types.ObjectId.isValid(assignedCounselor)) {
                return res.status(400).json({ error: 'Invalid counselor ID' });
            }
            matchStage.assignedCounselor = new mongoose.Types.ObjectId(assignedCounselor);
        }

        if (intakeDateRange) {
            const dateFilter = parseDateRange(intakeDateRange);
            if (dateFilter) matchStage.intendedIntake = dateFilter;
        }

        const pipeline = [];

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await Lead.aggregate(countPipeline);
        const totalLeads = countResult.length > 0 ? countResult[0].total : 0;

        const sortObj = {};
        const sortKey = sort.startsWith('-') ? sort.slice(1) : sort;
        sortObj[sortKey] = sort.startsWith('-') ? -1 : 1;

        pipeline.push(
            { $sort: sortObj },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'users', // Assuming User model is stored in 'users' collection
                    localField: 'assignedCounselor',
                    foreignField: '_id',
                    as: 'assignedCounselor',
                    pipeline: [{ $project: { password: 0 } }] // Exclude sensitive data
                }
            },
            {
                $unwind: {
                    path: '$assignedCounselor',
                    preserveNullAndEmptyArrays: true
                }
            }
        );

        const leads = await Lead.aggregate(pipeline);

        res.json({
            success: true,
            data: leads,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalLeads,
                totalPages: Math.ceil(totalLeads / limit)
            }
        });
    } catch (error) {
        console.error('Lead fetch error:', error);
        res.status(500).json({ error: 'Server error while fetching leads' });
    }
};

export const getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate({
                path: 'assignedCounselor',
                select: '-password'
            });

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json({ success: true, data: lead });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching lead' });
    }
};

export const createLead = async (req, res) => {
    try {
        const lead = await Lead.create(req.body);
        res.status(201).json({ success: true, data: lead });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'A lead with this email already exists.' });
        }
        res.status(400).json({ error: error.message || 'Invalid lead data' });
    }
};

export const updateLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { ...req.body, intendedIntake: req?.body?.intendedIntake ? intendedIntake : null },
            { new: true, runValidators: true }
        ).populate({
            path: 'assignedCounselor',
            select: '-password'
        });

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json({ success: true, data: lead });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already in use.' });
        }
        res.status(400).json({ error: error.message || 'Update failed' });
    }
};

export const deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json({ success: true, message: 'Lead deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Deletion failed' });
    }
};

export const getLeadStats = async (req, res) => {
    try {
        const stats = await Lead.aggregate([
            {
                $group: {
                    _id: null,
                    totalLeads: { $sum: 1 },
                    byStatus: {
                        $push: {
                            status: '$status',
                            count: { $sum: 1 }
                        }
                    },
                    bySource: {
                        $push: {
                            source: '$source',
                            count: { $sum: 1 }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalLeads: 1,
                    statusBreakdown: {
                        $arrayToObject: {
                            $map: {
                                input: { $setUnion: '$byStatus.status' },
                                as: 'status',
                                in: {
                                    k: '$$status',
                                    v: {
                                        $size: {
                                            $filter: {
                                                input: '$byStatus',
                                                cond: { $eq: ['$$this.status', '$$status'] }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    sourceBreakdown: {
                        $arrayToObject: {
                            $map: {
                                input: { $setUnion: '$bySource.source' },
                                as: 'source',
                                in: {
                                    k: '$$source',
                                    v: {
                                        $size: {
                                            $filter: {
                                                input: '$bySource',
                                                cond: { $eq: ['$$this.source', '$$source'] }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]);

        const result = stats[0] || {
            totalLeads: 0,
            statusBreakdown: {},
            sourceBreakdown: {}
        };

        const [statusStats, sourceStats] = await Promise.all([
            Lead.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Lead.aggregate([
                { $group: { _id: '$source', count: { $sum: 1 } } }
            ])
        ]);

        const formattedStatus = statusStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const formattedSource = sourceStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                totalLeads: result.totalLeads,
                statusBreakdown: formattedStatus,
                sourceBreakdown: formattedSource
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

// In leadController.js
export const addNoteToLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const createdBy = req.user._id; // assuming auth middleware attaches user

    if (!text?.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }

    const lead = await Lead.findByIdAndUpdate(
      id,
      {
        $push: {
          notes: {
            text: text.trim(),
            createdBy,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    ).populate('assignedCounselor', '-password');

    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
};