const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a batch name'],
        trim: true,
        maxlength: [100, 'Batch name cannot be more than 100 characters']
    },
    code: {
        type: String,
        required: [true, 'Please add a batch code'],
        unique: true,
        uppercase: true
    },
    course: {
        type: mongoose.Schema.ObjectId,
        ref: 'Course',
        required: [true, 'Please select a course']
    },
    instructor: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Please assign an instructor']
    }],
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
        discount:Number
    },
    capacity: {
        total: {
            type: Number,
            required: [true, 'Please add batch capacity']
        },
        enrolled: {
            type: Number,
            default: 0
        }
    },
    mode: {
        type: String,
        enum: ['online', 'offline', 'hybrid'],
        required: [true, 'Please select batch mode']
    },
    location: {
        venue: String,
        address: String,
        city: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
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
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    features: {
        liveClasses: {
            type: Boolean,
            default: true
        },
        recordedClasses: {
            type: Boolean,
            default: true
        },
        assignments: {
            type: Boolean,
            default: true
        },
        tests: {
            type: Boolean,
            default: true
        },
        certificates: {
            type: Boolean,
            default: true
        },
        mentoring: {
            type: Boolean,
            default: false
        },
        jobSupport: {
            type: Boolean,
            default: false
        }
    },
    requirements: {
        prerequisites: [String],
        techRequirements: [String],
        softwareNeeded: [String]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

batchSchema.virtual('liveClasses', {
    ref: 'LiveClass',
    localField: '_id',
    foreignField: 'batch',
    justOne: false
});

batchSchema.pre('save', function (next) {
    if (!this.code) {
        const timestamp = Date.now().toString().slice(-4);
        const courseName = this.course.title ? this.course.title.substring(0, 3).toUpperCase() : 'CRS';
        this.code = `${courseName}${timestamp}`;
    }
    next();
});


module.exports = mongoose.model('Batch', batchSchema);