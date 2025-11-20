import mongoose from 'mongoose';
import secondDB from '../../config/webDb.js';

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
            unique: true,
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

categorySchema.index({ slug: 1 }, { unique: true });
const Category = secondDB.model('Category', categorySchema);


const articleSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Blog title is required'],
            trim: true,
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            required: [true, 'A short description is required'],
            trim: true,
        },
        content: {
            type: String,
            required: [true, 'Blog content is required'],
        },
        coverImage: {
            type: String,
            trim: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
        },
        meta: {
            keywords: [String],
            metaDescription: {
                type: String,
                trim: true,
            },
        },
        status: {
            type: Boolean,
            default: true,
        },
        viewCount: {
            type: Number,
            default: 0,
        },
        readTime: {
            type: Number,
            default:0
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

articleSchema.index({ slug: 1 }, { unique: true });
articleSchema.index({ title: 'text', content: 'text' });

const Article = secondDB.model('Article', articleSchema);


const commentSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: [true, 'Comment content is required'],
            trim: true,
            minlength: [3, 'Comment must be at least 3 characters long'],
            maxlength: [1000, 'Comment cannot exceed 1000 characters']
        },
        article: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Article',
            required: [true, 'Article reference is required']
        },
        author: {
            name: String,
            id: String
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment',
            default: null // null means it's a top-level comment
        },
        replies: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment'
        }],
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        likes: [{
            user: String
        }],
        dislikes: [{
            user: String
        }],
        isApproved: {
            type: Boolean,
            default: false
        },
        ipAddress: {
            type: String,
            trim: true
        },
        userAgent: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

commentSchema.virtual('nestedReplies', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parent',
    options: { sort: { createdAt: -1 } }
});

commentSchema.index({ article: 1, createdAt: -1 });
commentSchema.index({ parent: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });

const Comment = secondDB.model('Comment', commentSchema);


export { Category, Article, Comment };