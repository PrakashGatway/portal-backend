import { Schema, model } from 'mongoose';

const SectionSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        instructions: {
            type: String,
            trim: true,
        },
        thumbnailPic: {
            type: String,
        },
        duration: {
            type: Number,
            required: true,
        },
        totalQuestions: {
            type: Number,
            required: true,
        },
        order: {
            type: Number,      // section order inside exam (1,2,3,...)
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

export const Section = model('Section', SectionSchema);