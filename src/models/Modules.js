import mongoose from "mongoose";

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

moduleSchema.virtual('liveClasses', {
  ref: 'LiveClasses',
  localField: '_id',
  foreignField: 'module',
  justOne: false
});

moduleSchema.virtual('recordedClasses', {
  ref: 'RecordedClasses',
  localField: '_id',
  foreignField: 'module',
  justOne: false
});

moduleSchema.virtual('tests', {
  ref: 'Tests',
  localField: '_id',
  foreignField: 'module',
  justOne: false
});

moduleSchema.pre('save', function (next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export default mongoose.model('Module', moduleSchema);