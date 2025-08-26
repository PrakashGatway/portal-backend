import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please add a course code'],
    unique: true,
    uppercase: true
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
  schedule: {
    startDate: {
      type: Date,
      required: [true, 'Please add batch start date']
    },
    endDate: {
      type: Date,
      required: [true, 'Please add batch end date']
    },
    enrollmentDeadline: Date,
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  pricing: {
    amount: {
      type: Number,
      required: [true, 'Please add batch price']
    },
    currency: {
      type: String,
      default: 'INR'
    },
    earlyBird: {
      discount: Number,
      deadline: Date
    },
    discount: Number
  },
  preview: {
    url: String,
    publicId: String,
    duration: Number
  },
  mode: {
    type: String,
    enum: ['online', 'offline', 'hybrid', 'recorded'],
    required: [true, 'Please select batch mode']
  },
  schedule_pattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'custom'],
      default: 'daily'
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    time: {
      start: String, // HH:MM format
      end: String    // HH:MM format
    },
    duration: Number // in minutes
  },
  features: [String],
  requirements: [String],
  objectives: [String],
  targetAudience: [String],
  tags: [String],
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  featured: {
    type: Boolean,
    default: false
  },
  extraFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  },
}, {
  timestamps: true
});

courseSchema.index({ category: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ featured: 1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Course', courseSchema);