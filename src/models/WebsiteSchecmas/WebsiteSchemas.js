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

export { Category, Article };