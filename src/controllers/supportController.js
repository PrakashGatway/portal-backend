import { SupportTicket } from '../models/Support.js';


export const getUserTickets = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            priority,
            category,
            search
        } = req.query;

        const filter = { userId: req.user.id };
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (category) filter.category = category;
        if (search) {
            filter.$or = [
                { subject: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const total = await SupportTicket.countDocuments(filter);
        const tickets = await SupportTicket.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('assignedTo', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            tickets,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(new AppError(err.message, 500));
    }
};

export const getTicketById = async (req, res, next) => {
    const { id } = req.params;
    if (!validateObjectId(id)) {
        return next(new AppError('Invalid ticket ID', 400));
    }

    const ticket = await SupportTicket.findOne({
        _id: id,
        userId: req.user.id
    }).populate('assignedTo', 'name email');

    if (!ticket) {
        return next(new AppError('Ticket not found', 404));
    }

    res.status(200).json({ success: true, ticket });
};

export const createTicket = async (req, res, next) => {
    try {
        const { relatedTo, relatedModel } = req.body;
        let ticketData = {
            ...req.body,
            userId: req.user.id,
            createdBy: req.user.id,
            replies: []
        };

        // Validate dynamic reference
        if (relatedTo && relatedModel && relatedModel !== 'None') {
            if (!validateObjectId(relatedTo)) {
                return next(new AppError('Invalid relatedTo ID', 400));
            }
            ticketData.relatedTo = relatedTo;
            ticketData.relatedModel = relatedModel;
        } else {
            ticketData.relatedModel = 'None';
        }

        const ticket = await SupportTicket.create(ticketData);
        res.status(201).json({ success: true, ticket });
    } catch (err) {
        next(new AppError(err.message, 400));
    }
};

export const addReply = async (req, res, next) => {
    const { id } = req.params;
    const { message } = req.body;

    if (!validateObjectId(id)) {
        return next(new AppError('Invalid ticket ID', 400));
    }
    if (!message?.trim()) {
        return next(new AppError('Message is required', 400));
    }

    const ticket = await SupportTicket.findOne({
        _id: id,
        userId: req.user.id
    });

    if (!ticket) {
        return next(new AppError('Ticket not found', 404));
    }

    // Auto-update status if user replies to a resolved/closed ticket
    let update = {
        $push: {
            replies: {
                message: message.trim(),
                createdBy: req.user.id,
                isSupport: false
            }
        }
    };

    if (ticket.status === 'resolved' || ticket.status === 'closed') {
        update.$set = { status: 'open' };
    }

    const updated = await SupportTicket.findByIdAndUpdate(
        id,
        update,
        { new: true }
    ).populate('assignedTo', 'name email');

    res.status(200).json({ success: true, ticket: updated });
};

export const updateTicketStatus = async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!validateObjectId(id)) {
        return next(new AppError('Invalid ticket ID', 400));
    }
    if (!status || !['open', 'resolved', 'closed'].includes(status)) {
        return next(new AppError('Valid status required', 400));
    }

    const ticket = await SupportTicket.findOneAndUpdate(
        { _id: id, userId: req.user.id },
        { status },
        { new: true }
    );

    if (!ticket) {
        return next(new AppError('Ticket not found', 404));
    }

    res.status(200).json({ success: true, ticket });
};