// models/Lead.js
import mongoose, { Schema } from 'mongoose';

const leadlogsSchema = new Schema(
    {
        phone: {
            type: String,
            trim: true,
        },
        callerId: {
            type: String,
            trim: true
        },
        recordingData: {
            type: Schema.Types.Mixed,
            default: {}
        },
        duration: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
        },
        extraDetails: {
            type: Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true,
        toObject: { virtuals: true }
    }
);

leadlogsSchema.index({ phone: 1 });

export const Leadlogs = mongoose.model('LeadLog', leadlogsSchema);