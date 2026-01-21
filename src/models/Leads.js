// models/Lead.js
import mongoose, { Schema } from 'mongoose';
// import { normalizeIndianPhone } from '../cronJob/convertNmber';

const normalizeIndianPhone = (number) => {
    if (!number) return null;

    let phone = String(number).trim();

    // Remove all non-digits
    phone = phone.replace(/\D/g, "");

    // Remove country code / leading prefixes
    if (phone.startsWith("91") && phone.length > 10) {
        phone = phone.slice(-10);
    }

    if (phone.startsWith("0") && phone.length > 10) {
        phone = phone.slice(-10);
    }

    // Validate Indian mobile number
    if (!/^[6-9]\d{9}$/.test(phone)) {
        return null;
    }

    return phone;
};

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
        phone10: {
            type: String,
            trim: true,
        },
        countryOfResidence: {
            type: String,
            trim: true
        },
        intendedIntake: {
            type: String
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
    if (this.isModified("phone") && this.phone) {
        const normalized = normalizeIndianPhone(this.phone);
        if (normalized) {
            this.phone10 = normalized;
        } else {
            this.phone10 = undefined;
        }
    }
    next();
});

export const LeadStatuses = LEAD_STATUSES;
export const LeadSources = LEAD_SOURCES;
export const Lead = mongoose.model('Lead', leadSchema);