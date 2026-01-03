// models/Lead.js
import mongoose, { Schema } from 'mongoose';

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

const LEAD_SOURCES = [
    'googleAds',
    'website',
    'education_fair',
    'referral',
    'metaAds',
    'social_media',
    'partner',
    'facebook',
    "excel",
    "other"
];

const leadSchema = new Schema(
    {
        fullName: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        countryOfResidence: {
            type: String,
            trim: true
        },
        intendedIntake: {
            type: Date,
        },
        city: {
            type: String,
            trim: true
        },
        coursePreference: {
            type: String,
        },
        status: {
            type: String,
            enum: {
                values: LEAD_STATUSES,
                message: 'Invalid lead status: {VALUE}'
            },
            default: 'new',
            required: true
        },
        source: {
            type: String,
            enum: {
                values: LEAD_SOURCES,
                message: 'Invalid lead source: {VALUE}'
            },
            required: [true, 'Lead source is required']
        },
        assignedCounselor: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: [
            {
                text: {
                    type: String,
                    required: true,
                    trim: true
                },
                createdBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                    required: true
                },
                createdAt: {
                    type: Date,
                    default: () => new Date()
                }
            }
        ],
        extraDetails: {
            type: Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedCounselor: 1 });
leadSchema.index({ createdAt: -1 });

leadSchema.pre('save', function (next) {
    if (this.isModified('email')) {
        this.email = this.email.toLowerCase().trim();
    }
    next();
});

export const LeadStatuses = LEAD_STATUSES;
export const LeadSources = LEAD_SOURCES;
export const Lead = mongoose.model('Lead', leadSchema);