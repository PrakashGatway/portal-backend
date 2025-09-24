import mongoose from "mongoose";

const { Schema } = mongoose;

const PromoCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    minPurchase: {
      type: Number,
      default: 0,
      min: 0
    },
    maxDiscount: {
      type: Number,
      min: 0
    },
    validFrom: {
      type: Date,
      required: true
    },
    validUntil: {
      type: Date,
      required: true
    },
    usageLimit: {
      type: Number,
      min: 0
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    type: {
      type: String,
      enum: [
        'general',        
        'course_specific',
        'user_specific',  
        'category_specific', 
        'user_course_specific'
      ],
      required: true,
      default: 'general'
    },
    courses: [{
      type: Schema.Types.ObjectId,
      ref: 'Course'
    }],
    categories: [{
      type: Schema.Types.ObjectId,
      ref: 'Category'
    }],
    applicableUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    applicableUserRoles: [{
      type: String,
      enum: ['user', 'teacher', 'admin', 'super_admin', 'editor', 'manager']
    }],
    maxUsesPerUser: {
      type: Number,
      min: 0,
      default: 0
    },
    terms: [{
      type: String,
      trim: true
    }],
    isFeatured: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

PromoCodeSchema.index({ code: 1 });
PromoCodeSchema.index({ type: 1 });
PromoCodeSchema.index({ isActive: 1 });

export default mongoose.model("PromoCode", PromoCodeSchema);