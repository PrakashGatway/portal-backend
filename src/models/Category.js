import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters'],
    unique: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  parent: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category'
  },
  image: {
    public_id: String,
    url: String
  },
  icon: String,
  color: {
    type: String,
    default: '#007bff'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
  justOne: false
});

categorySchema.virtual('coursesCount', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'category',
  count: true
});

export default mongoose.model('Category', categorySchema);