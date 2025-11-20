import { Comment, Article } from '../../models/WebsiteSchecmas/WebsiteSchemas.js';


export const createComment = async (req, res) => {
    try {
        const { articleId, content, parentCommentId } = req.body;
        const userId = req.user._id;
        const ipAddress = req.ip;
        const userAgent = req.get('User-Agent');

        // Validate article exists
        const article = await Article.findById(articleId);
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }
        let parentComment = null;
        if (parentCommentId) {
            parentComment = await Comment.findById(parentCommentId);
            if (!parentComment) {
                return res.status(404).json({
                    success: false,
                    message: 'Parent comment not found'
                });
            }
            // Ensure the parent comment belongs to the same article
            if (parentComment.article.toString() !== articleId) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent comment does not belong to this article'
                });
            }
        }

        const comment = new Comment({
            content,
            article: articleId,
            author: { name: req.user.name, id: userId },
            parent: parentCommentId || null,
            ipAddress,
            userAgent
        });

        const savedComment = await comment.save();

        // If it's a reply, add it to the parent comment's replies array
        if (parentCommentId) {
            await Comment.findByIdAndUpdate(parentCommentId, {
                $push: { replies: savedComment._id }
            });
        }

        // Populate author and article info
        const populatedComment = await Comment.findById(savedComment._id)
            .populate('article', 'title slug');

        res.status(201).json({
            success: true,
            message: parentCommentId ? 'Reply added successfully' : 'Comment added successfully',
            data: populatedComment
        });

    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating comment',
            error: error.message
        });
    }
};

// Get comments for an article (only approved ones)
export const getArticleComments = async (req, res) => {
    try {
        const { articleId } = req.params;
        const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

        // Validate article exists
        const article = await Article.findById(articleId);
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        const skip = (page - 1) * limit;

        // Get top-level comments (parent: null) that are approved
        const comments = await Comment.find({
            article: articleId,
            parent: null,
            status: 'approved'
        }).populate({
            path: 'nestedReplies',
            match: { status: 'approved' },
            options: { sort: { createdAt: -1 } }
        })
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const totalComments = await Comment.countDocuments({
            article: articleId,
            parent: null,
            status: 'approved'
        });

        res.status(200).json({
            success: true,
            data: {
                comments,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalComments / limit),
                    totalComments,
                    hasNext: skip + comments.length < totalComments,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching comments',
            error: error.message
        });
    }
};

// Get all comments (for admin)
export const getAllComments = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, articleId, authorId, sort = '-createdAt' } = req.query;

        const skip = (page - 1) * limit;
        const filter = {};

        if (status) filter.status = status;
        if (articleId) filter.article = articleId;
        if (authorId) filter.author = authorId;

        const comments = await Comment.find(filter)
            .populate('article', 'title slug')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const totalComments = await Comment.countDocuments(filter);

        res.status(200).json({
            success: true,
            comments,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalComments / limit),
                totalComments,
                hasNext: skip + comments.length < totalComments,
        });

    } catch (error) {
        console.error('Error fetching all comments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching comments',
            error: error.message
        });
    }
};

// Admin approve comment
export const approveComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const adminId = req.user._id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Update comment status
        comment.status = 'approved';
        comment.isApproved = true;
        comment.approvedBy = adminId;
        comment.approvedAt = new Date();
        comment.rejectedBy = null;
        comment.rejectedAt = null;

        await comment.save();

        res.status(200).json({
            success: true,
            message: 'Comment approved successfully',
            data: comment
        });

    } catch (error) {
        console.error('Error approving comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving comment',
            error: error.message
        });
    }
};

// Admin reject comment
export const rejectComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const adminId = req.user._id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Update comment status
        comment.status = 'rejected';
        comment.isApproved = false;
        comment.rejectedBy = adminId;
        comment.rejectedAt = new Date();
        comment.approvedBy = null;
        comment.approvedAt = null;

        await comment.save();

        res.status(200).json({
            success: true,
            message: 'Comment rejected successfully',
            data: comment
        });

    } catch (error) {
        console.error('Error rejecting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting comment',
            error: error.message
        });
    }
};

// User delete own comment
export const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        if (comment.parent === null) {
            await Comment.deleteMany({ parent: commentId });
        }

        if (comment.parent) {
            await Comment.findByIdAndUpdate(comment.parent, {
                $pull: { replies: commentId }
            });
        }

        await Comment.findByIdAndDelete(commentId);

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting comment',
            error: error.message
        });
    }
};

// Report a comment
export const reportComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { reason } = req.body;
        const userId = req.user._id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Mark as reported
        comment.reported = true;
        comment.reportReason = reason;
        await comment.save();

        res.status(200).json({
            success: true,
            message: 'Comment reported successfully',
            data: comment
        });

    } catch (error) {
        console.error('Error reporting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error reporting comment',
            error: error.message
        });
    }
};

// Like a comment
export const likeComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Remove from dislikes if exists
        await Comment.findByIdAndUpdate(commentId, {
            $pull: { dislikes: { user: userId } }
        });

        // Add to likes if not already liked
        const existingLike = comment.likes.find(like => like.user.toString() === userId.toString());
        if (!existingLike) {
            await Comment.findByIdAndUpdate(commentId, {
                $push: { likes: { user: userId } }
            });
        }

        const updatedComment = await Comment.findById(commentId)
            .populate('author', 'name email avatar');

        res.status(200).json({
            success: true,
            message: 'Comment liked successfully',
            data: updatedComment
        });

    } catch (error) {
        console.error('Error liking comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error liking comment',
            error: error.message
        });
    }
};

// Dislike a comment
export const dislikeComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Remove from likes if exists
        await Comment.findByIdAndUpdate(commentId, {
            $pull: { likes: { user: userId } }
        });

        // Add to dislikes if not already disliked
        const existingDislike = comment.dislikes.find(dislike => dislike.user.toString() === userId.toString());
        if (!existingDislike) {
            await Comment.findByIdAndUpdate(commentId, {
                $push: { dislikes: { user: userId } }
            });
        }

        const updatedComment = await Comment.findById(commentId)
            .populate('author', 'name email avatar');

        res.status(200).json({
            success: true,
            message: 'Comment disliked successfully',
            data: updatedComment
        });

    } catch (error) {
        console.error('Error disliking comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error disliking comment',
            error: error.message
        });
    }
};

// Get comment statistics
export const getCommentStats = async (req, res) => {
    try {
        const stats = await Comment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalComments = await Comment.countDocuments();
        const pendingComments = await Comment.countDocuments({ status: 'pending' });
        const approvedComments = await Comment.countDocuments({ status: 'approved' });
        const rejectedComments = await Comment.countDocuments({ status: 'rejected' });

        res.status(200).json({
            success: true,
            data: {
                totalComments,
                pendingComments,
                approvedComments,
                rejectedComments,
                statusBreakdown: stats
            }
        });

    } catch (error) {
        console.error('Error fetching comment stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching comment stats',
            error: error.message
        });
    }
};