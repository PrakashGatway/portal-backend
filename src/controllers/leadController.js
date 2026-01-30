import axios from 'axios';
import { Leadlogs } from '../models/leadLogs.js';
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


const LEAD_STATUSES = [
    'new',
    'notReachable',
    'followup',
    'viewed',
    'contacted',
    'interested',
    'notInterested',
    'enrolled',
    'rejected',
    'junk',
    'visitDone',
    'visitSchedule',
    'inactive'
];

export const getLeadStatusStats = async (req, res) => {
    try {
        const {
            source,
            assignedCounselor,
            sort = -1,
            dateRange,
            search
        } = req.query;

        const user = req.user;
        const match = {};

        if (source) match.source = source;

        if (user.role === "counselor") {
            match.assignedCounselor = user._id;
        } else {
            if (assignedCounselor) match.assignedCounselor = new mongoose.Types.ObjectId(assignedCounselor);
        }

        if (dateRange) {
            const dateFilter = parseDateRange(dateRange);
            if (dateFilter) match.createdAt = dateFilter;
        }

        if (search && search != null) {
            const searchRegex = { $regex: search, $options: 'i' };
            match.$or = [
                { fullName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex }
            ];
        }


        const pipeline = [
            { $match: match },
            { $sort: { createdAt: sort == 1 ? 1 : -1 } },
            {
                $facet: {
                    counts: [
                        {
                            $group: {
                                _id: "$status",
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    total: [
                        { $count: "count" }
                    ]
                }
            },
            {
                $project: {
                    total: {
                        $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0]
                    },
                    counts: 1
                }
            },
            {
                $project: {
                    stats: {
                        $concatArrays: [
                            [
                                {
                                    status: "all",
                                    count: "$total"
                                }
                            ],
                            {
                                $map: {
                                    input: LEAD_STATUSES,
                                    as: "status",
                                    in: {
                                        status: "$$status",
                                        count: {
                                            $ifNull: [
                                                {
                                                    $let: {
                                                        vars: {
                                                            matched: {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $filter: {
                                                                            input: "$counts",
                                                                            as: "c",
                                                                            cond: {
                                                                                $eq: ["$$c._id", "$$status"]
                                                                            }
                                                                        }
                                                                    },
                                                                    0
                                                                ]
                                                            }
                                                        },
                                                        in: "$$matched.count"
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        ];

        const [result] = await Lead.aggregate(pipeline);

        res.json({
            success: true,
            stats: result?.stats || []
        });

    } catch (error) {
        console.error("Lead status stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lead status stats"
        });
    }
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
            dateRange,
            intakeDateRange // format: "YYYY-MM-DD_YYYY-MM-DD"
        } = req.query;

        const user = req.user;

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

        if (assignedCounselor || user.role == "counselor") {
            if (!mongoose.Types.ObjectId.isValid(assignedCounselor) && user.role == "admin") {
                return res.status(400).json({ error: 'Invalid counselor ID' });
            }
            matchStage.assignedCounselor = user.role == "counselor" ? user._id : new mongoose.Types.ObjectId(assignedCounselor);
        }

        if (dateRange) {
            const dateFilter = parseDateRange(dateRange);
            if (dateFilter) matchStage.createdAt = dateFilter;
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
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                name: 1,
                                email: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: {
                    path: '$assignedCounselor',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "leadlogs",
                    localField: "phone10",
                    foreignField: "phone",
                    pipeline: [
                        {
                            $group: {
                                _id: null,
                                answeredCalls: {
                                    $sum: {
                                        $cond: [{ $eq: ["$status", "3"] }, 1, 0]
                                    }
                                },
                                notConnectedCalls: {
                                    $sum: {
                                        $cond: [{ $ne: ["$status", "3"] }, 1, 0]
                                    }
                                }
                            }
                        }
                    ],
                    as: "callStats"
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
            { ...req.body, intendedIntake: req?.body?.intendedIntake ? req?.body?.intendedIntake : null },
            { new: true, runValidators: true }
        )

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

export const bulkAddLeads = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { leads } = req.body;

        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Leads array is required",
            });
        }

        session.startTransaction();

        const validLeads = [];

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];

            if (!lead.status) {
                throw new Error(`Row ${i + 1}: Invalid status ${lead.status}`);
            }
            if (!lead.source) {
                throw new Error(`Row ${i + 1}: Invalid source ${lead.source}`);
            }
            validLeads.push({
                fullName: lead.fullName?.trim(),
                email: lead.email?.toLowerCase().trim(),
                phone: lead.phone?.trim(),
                countryOfResidence: lead.countryOfResidence,
                city: lead.city,
                coursePreference: lead.coursePreference,
                intendedIntake: lead.intendedIntake
                    ? lead.intendedIntake
                    : undefined,
                status: lead.status || "new",
                source: lead.source,
                extraDetails: lead.extraDetails || {},
            });
        }

        if (!validLeads.length) {
            throw new Error("No valid leads found");
        }

        const insertedLeads = await Lead.insertMany(validLeads, {
            ordered: true,
            session,
        });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: "Bulk leads uploaded successfully",
            insertedCount: insertedLeads.length,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Bulk lead upload aborted:", error.message);

        return res.status(400).json({
            success: false,
            message: "Bulk upload failed. No leads were inserted.",
            error: error.message,
        });
    }
};

export const bulkDeleteLeads = async (req, res) => {
    try {
        const { ids } = req.body;
        // Validate input
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Request body must contain a non-empty array of IDs." });
        }

        const isValid = ids.every(id => mongoose.Types.ObjectId.isValid(id));
        if (!isValid) {
            return res.status(400).json({ message: "One or more IDs are invalid." });
        }

        const result = await Lead.deleteMany({ _id: { $in: ids } }); // Assumes your model is named 'Lead'

        res.status(200).json({ message: `${result.deletedCount} lead(s) deleted successfully.`, deletedCount: result.deletedCount });

    } catch (error) {
        console.error("Bulk delete error:", error);
        res.status(500).json({ message: "Server error during bulk deletion.", error: error.message });
    }
};

export const bulkAssignCounselor = async (req, res) => {
    const { counselorId, leadIds } = req.body;

    if (!counselorId || !Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Counselor ID and lead IDs are required",
        });
    }

    const result = await Lead.updateMany(
        { _id: { $in: leadIds } },
        {
            $set: {
                assignedCounselor: counselorId
            },
        }
    );

    res.json({
        success: true,
        modifiedCount: result.modifiedCount,
    });
};

export const logsPush = async (req, res) => {
    const query = req.body;
    if (!query) {
        res.send("GODBLESSYOU")
    }
    let { cNumber, cNumber10, callId, masterAgentNumber, recordings, talkDuration, callStatus, ivrSTime, ivrETime, HangupBySourceDetected, masterNumCTC, firstAttended, cType, CTC, did } = query;

    await Leadlogs.create({
        phone: cNumber10 || cNumber,
        callerId: callId,
        recordingData: recordings,
        duration: talkDuration,
        status: callStatus,
        ivrSTime: ivrSTime,
        ivrETime: ivrETime,
        masterCallNumber: masterAgentNumber || masterNumCTC,
        extraDetails: { HangupBySourceDetected, firstAttended, cType, CTC, did },
    });

    res.send("GODBLESSYOU")
};

export const addLogsNotes = async (req, res) => {
    try {
        const {
            activityId,
            leadId,
            leadName,
            notes,
            callType,
            callPurpose,
            followUpDate
        } = req.body;

        if (!activityId) {
            return res.status(400).json({
                success: false,
                message: "activityId is required"
            });
        }

        const updatedLog = await Leadlogs.findByIdAndUpdate(
            activityId,
            {
                $set: {
                    "extraDetails.callType": callType,
                    "extraDetails.callPurpose": callPurpose,
                    "extraDetails.followUpDate": followUpDate,
                    "extraDetails.leadId": leadId,
                    "extraDetails.leadName": leadName,
                    "extraDetails.notes": notes,
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedLog) {
            return res.status(404).json({
                success: false,
                message: "Log not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Log updated successfully"
        });

    } catch (error) {
        console.error("addLogsNotes error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};



export const bulkSaveCallLogs = async (callLogs = []) => {
    try {
        if (!Array.isArray(callLogs) || callLogs.length === 0) {
            return { insertedCount: 0, skippedCount: 0 };
        }

        // 1️⃣ Collect callIds to avoid duplicates
        const callIds = callLogs.map((log) => log.callId).filter(Boolean);

        const existingLogs = await Leadlogs.find(
            { callerId: { $in: callIds } },
            { callerId: 1 }
        );

        const existingCallIds = new Set(
            existingLogs.map((log) => log.callerId)
        );

        // 2️⃣ Prepare docs for insert
        const docsToInsert = callLogs
            .filter((log) => !existingCallIds.has(log.callId))
            .map((log) => {
                return {
                    phone: log.cNumber,
                    callerId: log.callId,
                    masterCallNumber: "9887120429",
                    recordingData: log.recordings,
                    duration: Number(log.talkDuration) || 0,
                    status: log.callStatus,
                    ivrSTime: log.ivrSTime,
                    ivrETime: log.ivrETime,
                    extraDetails: {
                        hungupby: 1
                    },
                };
            });

        // 3️⃣ Insert many
        if (docsToInsert.length > 0) {
            await Leadlogs.insertMany(docsToInsert, { ordered: false });
        }

        return {
            insertedCount: docsToInsert.length,
            skippedCount: callLogs.length - docsToInsert.length,
        };
    } catch (error) {
        console.error("❌ Bulk insert failed:", error);
        throw error;
    }
};

// console.log("🚀 Bulk insert function:", bulkSaveCallLogs());


const normalizeIndianPhone = (number) => {
    if (!number) return null;
    let phone = String(number).trim();

    if (phone.length == 10 && /^[6-9]\d{9}$/.test(phone)) {
        return phone;
    }

    if (phone.startsWith("+91")) {
        phone = phone.slice(3);
    }
    if (phone.startsWith("91")) {
        phone = phone.slice(2);
    }
    if (phone.startsWith("0")) {
        phone = phone.slice(1);
    }
    phone = phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(phone)) {
        return null;
    }

    return phone;
};

export const clickToCall = async (req, res) => {
    try {

        const { masterNumber } = req.query;

        const lead = await Lead.findById(req.params.id)
            .populate({
                path: 'assignedCounselor',
                select: '-password'
            });

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        if (!lead.phone) {
            return res.status(400).json({ error: 'Lead phone number not found' });
        }

        let masterNum;

        if (lead.assignedCounselor && lead.assignedCounselor.phoneNumber) {
            masterNum = lead.assignedCounselor.phoneNumber;
        }
        if (masterNumber) {
            masterNum = masterNumber;
        }
        try {
            const clickToCallResponse = await axios.get(`https://w.digiskyweb.com/v2/clickToCall/para?user_id=28882897&token=NHzuuPAMM6S0cfwsAg7i&from=${normalizeIndianPhone(masterNum)}&to=${normalizeIndianPhone(lead.phone)}`)

            if (clickToCallResponse.status !== 200) {
                return res.status(500).json({ error: 'Failed to initiate click-to-call' });
            }
            res.json(clickToCallResponse?.data);
        } catch (error) {
            return res.json({ error });
        }

    } catch (error) {
        res.status(500).json({ error: 'Error to initiate click-to-call' });
    }
};

export const getCallLogsByPhone = async (req, res) => {
    try {
        const {
            phone,
            page = 1,
            limit = 20,
            status,
            masterCallNumber,
            dateRange,
            sort = "-ivrSTime",
        } = req.query;
        if (!phone) {
            return res.status(400).json({ error: "Phone is required" });
        }

        const phone10 = normalizeIndianPhone(phone);
        if (!phone10) {
            return res.status(400).json({ error: "Invalid phone number" });
        }

        /* ---------------- MATCH FILTER ---------------- */
        const matchStage = {
            phone: { $regex: `${phone10}$` }, // safe fallback
        };

        if (status) {
            if (status === "answered") {
                matchStage.status = "3";
            } else if (status === "notConnected") {
                matchStage.status = { $ne: "3" };
            } else {
                matchStage.status = status;
            }
        }

        if (masterCallNumber) {
            matchStage.masterCallNumber = {
                $regex: masterCallNumber,
                $options: "i",
            };
        }

        if (dateRange) {
            const [startDate, endDate] = dateRange.split("_");

            if (!startDate || !endDate) {
                return res.status(400).json({ error: "Invalid dateRange format. Use YYYY-MM-DD_YYYY-MM-DD" });
            }

            matchStage.ivrSTime = {
                $gte: new Date(`${startDate}T00:00:00.000Z`),
                $lte: new Date(`${endDate}T23:59:59.999Z`)
            };
        }


        /* ---------------- AGGREGATION ---------------- */
        const pipeline = [
            { $match: matchStage },

            {
                $addFields: {
                    isAnswered: { $eq: ["$status", "3"] },
                },
            },

            { $sort: { [sort.replace("-", "")]: sort.startsWith("-") ? -1 : 1 } },

            { $skip: (Number(page) - 1) * Number(limit) },
            { $limit: Number(limit) },
        ];

        const countPipeline = [
            { $match: matchStage },
            { $count: "total" },
        ];

        const [logs, countResult] = await Promise.all([
            Leadlogs.aggregate(pipeline),
            Leadlogs.aggregate(countPipeline),
        ]);

        const total = countResult[0]?.total || 0;

        /* ---------------- RESPONSE ---------------- */
        res.json({
            success: true,
            data: logs,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("❌ Fetch call logs error:", error);
        res.status(500).json({ error: "Failed to fetch call logs" });
    }
};

export const getIncomingCalls = async (req, res) => {
    try {
        const {
            phone,
            page = 1,
            limit = 20,
            masterCallNumber,
            dateRange,
            sort = "-ivrSTime",
        } = req.query;

        // if (!phone) {
        //     return res.status(400).json({ error: "Phone is required" });
        // }

        // const phone10 = normalizeIndianPhone(phone);
        // if (!phone10) {
        //     return res.status(400).json({ error: "Invalid phone number" });
        // }

        const matchStage = {};


        matchStage["extraDetails.cType"] = "IBD"

        if (req.user.role == "counselor") {
            matchStage["extraDetails.did"] = req.user._id == "68e9fe2e2291b0f5bcfcc1f6" ? "07557122814" : req.user._id == "68fb4accfb893677bc9fcc45" ? "07557122813" : ""
        }

        // if (masterCallNumber) {
        //     matchStage.masterCallNumber = {
        //         $regex: masterCallNumber,
        //         $options: "i",
        //     };
        // }

        // if (dateRange) {
        //     const [startDate, endDate] = dateRange.split("_");

        //     if (!startDate || !endDate) {
        //         return res.status(400).json({ error: "Invalid dateRange format. Use YYYY-MM-DD_YYYY-MM-DD" });
        //     }

        //     matchStage.ivrSTime = {
        //         $gte: new Date(`${startDate}T00:00:00.000Z`),
        //         $lte: new Date(`${endDate}T23:59:59.999Z`)
        //     };
        // }

        const pipeline = [
            { $match: matchStage },

            { $sort: { [sort.replace("-", "")]: sort.startsWith("-") ? -1 : 1 } },

            { $skip: (Number(page) - 1) * Number(limit) },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: "leads",
                    localField: "phone",
                    foreignField: "phone10",
                    as: "leadinfo",
                    pipeline: [
                        {
                            $project: {
                                phone10: 1,
                                fullName: 1,
                                email: 1,
                                status: 1
                            },
                        },
                    ],
                }
            },
            { $unwind: { path: "$leadinfo", preserveNullAndEmptyArrays: true } },
        ];

        const countPipeline = [
            { $match: matchStage },
            { $count: "total" },
        ];

        const [logs, countResult] = await Promise.all([
            Leadlogs.aggregate(pipeline),
            Leadlogs.aggregate(countPipeline),
        ]);

        const total = countResult[0]?.total || 0;
        res.json({
            success: true,
            data: logs,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("❌ Fetch call logs error:", error);
        res.status(500).json({ error: "Failed to fetch call logs" });
    }
};