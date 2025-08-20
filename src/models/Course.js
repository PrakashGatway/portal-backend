import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: [true, 'Please select a category']
  },
  subcategory: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category'
  },
  instructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  language: {
    type: String,
    default: 'English'
  },
  thumbnail: {
    url: String,
    publicId: String
  },
  preview: {
    url: String,
    publicId: String,
    duration: Number
  },
  features: [String],
  requirements: [String],
  objectives: [String],
  targetAudience: [String],
  tags: [String],
  duration: {
    type: Number, // total duration in minutes
    default: 0
  },
  studentsCount: {
    type: Number,
    default: 0
  },
  maxEnrollments: Number,
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  certificate: {
    available: {
      type: Boolean,
      default: false
    },
    template: String
  },
  settings: {
    allowReviews: {
      type: Boolean,
      default: true
    },
    allowDiscussions: {
      type: Boolean,
      default: true
    },
    autoEnroll: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ featured: 1 });
courseSchema.index({ studentsCount: -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Course', courseSchema);