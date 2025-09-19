import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'teacher', 'admin', 'super_admin', 'editor', "manager"],
    default: 'user'
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category'
  },
  subCategory: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category'
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  profile: {
    dateOfBirth: Date,
    bio: String,
    gender: String
  },
  profilePic: {
    type: String
  },
  subscription: {
    type: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
  },
  coursesTeaching: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  education: [{
    degree: String,
    institution: String,
    year: Number,
    grade: String
  }],
  experience: [{
    title: String,
    company: String,
    duration: String,
    description: String
  }],
  skills: [String],
  socialLinks: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String
  },
  courses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0
    }
  }],
  achievements: [{
    title: String,
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    icon: String
  }],
  lastActive: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  refreshTokens: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

userSchema.virtual('enrolledCoursesCount').get(function () {
  return this.courses.length;
});

userSchema.virtual('fullAddress').get(function () {
  if (!this.address) return "";
  const { street, city, state, country, zipCode } = this.address;
  return street + " " + city + " ," + state + "," + country + " " + zipCode;
});


export default mongoose.model('User', userSchema);