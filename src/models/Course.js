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
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coInstructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  category: {
    type: String,
    required: true,
    enum: ['programming', 'design', 'business', 'marketing', 'photography', 'music', 'health', 'language', 'academic', 'test-prep', 'other']
  },
  subcategory: String,
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  language: {
    type: String,
    default: 'en'
  },
  thumbnail: {
    url: String,
    publicId: String
  },
  preview: {
    video: {
      url: String,
      publicId: String,
      duration: Number
    }
  },
  pricing: {
    type: {
      type: String,
      enum: ['free', 'paid', 'subscription'],
      default: 'free'
    },
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    discount: {
      percentage: Number,
      validUntil: Date
    }
  },
  syllabus: [{
    title: String,
    description: String,
    lessons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    duration: Number, // in minutes
    order: Number
  }],
  requirements: [String],
  objectives: [String],
  targetAudience: [String],
  tags: [String],
  duration: {
    type: Number, // total duration in minutes
    default: 0
  },
  lessonsCount: {
    type: Number,
    default: 0
  },
  studentsCount: {
    type: Number,
    default: 0
  },
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

// Indexes for better performance
courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ featured: 1 });
courseSchema.index({ 'rating.average': -1 });
courseSchema.index({ studentsCount: -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Calculate average rating
courseSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
    return;
  }
  
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  this.rating.average = Number((sum / this.reviews.length).toFixed(1));
  this.rating.count = this.reviews.length;
};

export default mongoose.model('Course', courseSchema);