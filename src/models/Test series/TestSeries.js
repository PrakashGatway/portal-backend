import { Schema, model } from 'mongoose';

const testSeriesSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        type: {
            type: String,
            enum: ['Full-Length', 'Mini-Series', 'Sectional'],
            required: true,
        },
        subType:{
            type: String,
            enum:["reading","listening","speaking","writing"]
        },
        description: {
            type: String,
            trim: true,
        },
        examId: {
            type: Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
        },
        thumbnailPic: {
            type: String,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        difficultyLevel: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
            default: 'Intermediate',
        },
        isPaid: {
            type: Boolean,
            default: false,
        },
        sections: [
            {
                sectionId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Section',
                    required: true,
                },
                order: { type: Number, required: true },
                questionIds: [{
                    type: Schema.Types.ObjectId,
                    ref: 'Question',
                    required: true,
                }],
                duration: Number,
                totalQuestions: Number,
            }
        ],
        price: {
            amount: {
                type: Number,
                min: 0,
                default: 0,
            },
            discount: {
                type: Number,
                min: 0,
                default: 0,
            },
            currency: {
                type: String,
                default: 'INR',
                uppercase: true,
                match: /^[A-Z]{3}$/,
            },
        },
        negativeMarking: {
            type: Number,
            min: 0,
            default: 0,
        },
        duration: {
            type: Number,
            required: true,
            min: 1,
        },
        totalQuestions: {
            type: Number,
            required: true,
            min: 1,
        },
        passingScore: {
            type: Number,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        courseAccess: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Course',
            }
        ],
        isTimed: {
            type: Boolean,
            default: true,
        },
        allowPause: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

testSeriesSchema.index({ examId: 1 });
testSeriesSchema.index({ isActive: 1, visibility: 1 });
testSeriesSchema.index({ scheduledDate: 1 });

const TestSeries = model('TestSeries', testSeriesSchema);

export default TestSeries;