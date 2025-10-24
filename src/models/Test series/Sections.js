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
        }
    },
    {
        timestamps: true,
    }
);

SectionSchema.index({ examId: 1, order: 1 });

export const Section = model('Section', SectionSchema);