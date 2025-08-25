import mongoose from 'mongoose';

const basePageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subTitle: {
        type: String,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    pageType: {
        type: String,
        required: true
    },
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    canonicalUrl: String,
    isFeatured: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    tags: [String],
    pageContent: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: () => new Map()
    },
    sections: [{
        type: {
            type: String,
            required: true
        },
        order: {
            type: Number,
            default: 0
        },
        content: {
            type: mongoose.Schema.Types.Mixed, // flexible JSON for any type
            required: true
        }
    }]
}, {
    timestamps: true
});

export default mongoose.model('Page', basePageSchema);