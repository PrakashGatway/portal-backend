import { Schema, model } from 'mongoose';

const examSchema = new Schema(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    examType: {
      type: String,
      enum: ['Language Proficiency', 'Undergraduate Admission', 'Graduate Admission'],
      required: true,
    },
    sections: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Section',
        required: true,
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true
  }
);

examSchema.index({ name: 1 });
examSchema.index({ isActive: 1 });

const Exam = model('Exam', examSchema);

export default Exam;