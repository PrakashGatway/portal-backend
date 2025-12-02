import mongoose from 'mongoose';

const purchasedCourseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    itemType: {
        type: String,
        enum: ['course', 'package', 'testSeries'],
        required: true
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
        refPath: 'itemType'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    enrolledAt: { type: Date, default: Date.now },
    accessExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    revokedReason: { type: String },
    progress: {
        percentage: { type: Number, min: 0, max: 100, default: 0 },
        completedLessons: [{
            lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
            completedAt: { type: Date, default: Date.now }
        }]
    },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    totalTimeSpent: { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
    recentLessons: [{
        lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
        progress: { type: Number, min: 0, max: 100, default: 0 },
        durationWatched: { type: Number, default: 0 }
    }],
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

purchasedCourseSchema.virtual('isExpired').get(function () {
    return this.accessExpiresAt ? this.accessExpiresAt < new Date() : false;
});

purchasedCourseSchema.index({ user: 1, isActive: 1 });
purchasedCourseSchema.index({ course: 1, isCompleted: 1 });
purchasedCourseSchema.index({ enrolledAt: -1 });
purchasedCourseSchema.index({ "progress.percentage": -1, course: 1 });
purchasedCourseSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model('PurchasedCourse', purchasedCourseSchema);
