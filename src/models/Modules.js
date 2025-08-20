const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a module title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: [true, 'Please select a course']
  },
  order: {
    type: Number,
    required: [true, 'Please add module order']
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  objectives: [String],
  prerequisites: [String],
  resources: [{
    title: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'document']
    },
    url: String,
    size: Number
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for live classes
moduleSchema.virtual('liveClasses', {
  ref: 'LiveClass',
  localField: '_id',
  foreignField: 'module',
  justOne: false
});

// Virtual for recorded classes
moduleSchema.virtual('recordedClasses', {
  ref: 'RecordedClass',
  localField: '_id',
  foreignField: 'module',
  justOne: false
});

// Virtual for tests
moduleSchema.virtual('tests', {
  ref: 'Test',
  localField: '_id',
  foreignField: 'module',
  justOne: false
});

// Set published date when isPublished changes to true
moduleSchema.pre('save', function(next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Module', moduleSchema);