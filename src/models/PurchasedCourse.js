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
        enum: ["Course", "package", "McuTestSeries", "TestTemplate", "subscription", "ilets"],
        default: "Course",
        required: true
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
        refPath: 'itemType'
    },
    enrolledAt: { type: Date, default: Date.now },
    accessExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    revokedReason: { type: String },
    percentage: { type: Number, min: 0, max: 100, default: 0 },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    totalTimeSpent: { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
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
purchasedCourseSchema.index({ user: 1, itemId: 1 }, { unique: true });

export default mongoose.model('PurchasedCourse', purchasedCourseSchema);
