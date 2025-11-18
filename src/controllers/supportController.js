import { SupportTicket } from '../models/Support.js';

// Get all support tickets (with filtering options)
export const getAllTickets = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            priority,
            category,
            search,
            assignedTo
        } = req.query;

        let filter = {};

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (category) filter.category = category;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (search) {
            filter.$or = [
                { subject: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // For regular users, only show their own tickets
        if (req.user.role !== 'admin' && req.user.role !== 'support') {
            filter.userId = req.user._id;
        }

        const tickets = await SupportTicket.find(filter)
            .populate('userId', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await SupportTicket.countDocuments(filter);

        res.json({
            success: true,
            tickets,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single support ticket
export const getTicketById = async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('assignedTo', 'name email')
            .populate('replies.createdBy', 'name email');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Check if user can access this ticket
        if (req.user.role !== 'admin' && req.user.role !== 'support' &&
            ticket.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new support ticket
export const createTicket = async (req, res) => {
    try {
        const { subject, description, category, priority, relatedTo, relatedModel, extraInfo } = req.body;

        const ticket = new SupportTicket({
            userId: req.user._id,
            subject,
            description,
            category,
            priority,
            relatedTo: relatedTo || undefined,
            relatedModel: relatedModel || 'None',
            extraInfo
        });

        await ticket.save();

        await ticket.populate('userId', 'name email');

        res.status(201).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update ticket status/priority/assignment
export const updateTicket = async (req, res) => {
    try {
        const allowedUpdates = ['status', 'priority', 'assignedTo', 'category'];
        const updates = {};

        allowedUpdates.forEach(update => {
            if (req.body[update] !== undefined) {
                updates[update] = req.body[update];
            }
        });

        const ticket = await SupportTicket.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate('userId', 'name email');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            data: ticket
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete ticket (admin only)
export const deleteTicket = async (req, res) => {
    try {
        const ticket = await SupportTicket.findByIdAndDelete(req.params.id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add reply to ticket
export const addReply = async (req, res) => {
    try {
        const { message } = req.body;

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Check if user can reply to this ticket
        if (req.user.role !== 'admin' && req.user.role !== 'support' &&
            ticket.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const isSupport = req.user.role === 'admin' || req.user.role === 'support';

        ticket.replies.push({
            message,
            createdBy: req.user._id,
            isSupport
        });

        await ticket.save();
        await ticket.populate('replies.createdBy', 'name email');

        res.status(201).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Close ticket
export const closeTicket = async (req, res) => {
    try {
        const ticket = await SupportTicket.findByIdAndUpdate(
            req.params.id,
            { status: 'closed' },
            { new: true }
        ).populate('userId', 'name email');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user's tickets
export const getUserTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: tickets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get ticket statistics (admin only)
export const getTicketStats = async (req, res) => {
    try {
        const stats = await SupportTicket.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const priorityStats = await SupportTicket.aggregate([
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);

        const categoryStats = await SupportTicket.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                status: stats,
                priority: priorityStats,
                category: categoryStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};