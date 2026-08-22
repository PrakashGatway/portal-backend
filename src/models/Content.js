import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    thumbnailPic: {
      type: String,
    },
    slug: {
      type: String,
      required: [true, "Please add a slug"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [2000, "Description cannot be more than 2000 characters"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Please select a course"],
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
    },
    order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "scheduled", "live"],
      default: "draft",
    },
    publishedAt: Date,
    isFree: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    duration: {
      type: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    discriminatorKey: "__t",
  },
);

contentSchema.index({ course: 1 });
contentSchema.index({ instructor: 1 });
contentSchema.index({ status: 1 });
contentSchema.index({ publishedAt: -1 });
contentSchema.index({ title: "text", description: "text" });

contentSchema.virtual("contentType").get(function () {
  return this.__t || "Content";
});

contentSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }
  next();
});

const Content = mongoose.model("Content", contentSchema);

const liveClassSchema = new mongoose.Schema({
  scheduledStart: {
    type: Date,
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please select an instructor"],
  },
  scheduledEnd: {
    type: Date,
    required: true,
  },
  actualStart: Date,
  actualEnd: Date,
  meetingId: String,
  meetingUrl: String,
  meetingPassword: String,
});

const recordedClassSchema = new mongoose.Schema({
  video: {
    url: {
      type: String,
    },
    publicId: String,
    duration: {
      type: Number, // in seconds
    },
  },
  content: {
    objectives: [String],
    keyPoints: [String],
    summary: String,
    transcript: String,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please select an instructor"],
  },
  analytics: {
    views: {
      type: Number,
      default: 0,
    },
    averageWatchTime: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
});

const studyMaterialSchema = new mongoose.Schema({
  materialType: {
    type: String,
    enum: ["pdf", "document", "link", "image", "audio"],
    required: true,
  },
  file: {
    url: String,
    publicId: String,
    size: Number,
    mimeType: String,
  },
  content: {
    text: String,
    pages: Number,
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  externalLink: String,
  isDownloadable: {
    type: Boolean,
    default: true,
  },
  version: {
    type: String,
    default: "1.0",
  }
});

const sessionSchema = new mongoose.Schema({
  scheduledStart: {
    type: Date,
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please select an instructor"],
  },
  scheduledEnd: {
    type: Date,
    required: true,
  },
  actualStart: Date,
  actualEnd: Date,
  meetingId: String,
  meetingUrl: String,
  meetingPassword: String,
});

const testSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TestTemplate",
  }
});

const LiveClass = Content.discriminator("LiveClasses", liveClassSchema);
const RecordedClass = Content.discriminator(
  "RecordedClasses",
  recordedClassSchema,
);
const StudyMaterial = Content.discriminator(
  "StudyMaterials",
  studyMaterialSchema,
);
const Session = Content.discriminator("Sessions", sessionSchema);

const Test = Content.discriminator("Tests", testSchema);


export { Content, LiveClass, RecordedClass, StudyMaterial, Session, Test };
