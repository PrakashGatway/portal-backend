// models/testSeries.model.ts
import { Schema, model } from "mongoose";

// ⭐ pricing for the bundle
const seriesPricingSchema = new Schema(
  {
    isFree: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    salePrice: { type: Number },
    currency: { type: String, default: "INR" },
  },
  { _id: false }
);

// ⭐ link each test inside the series
const seriesTestItemSchema = new Schema(
  {
    test: {
      type: Schema.Types.ObjectId,
      ref: "TestTemplate",
      required: true,
    },
    isMandatory: { type: Boolean, default: true }, // required test in this pack
    label: { type: String },
    accessDays: { type: Number }, // e.g. 30 days access for this test in this pack
  },
  { _id: false }
);

const testSeriesSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,

    exam: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    defaultTestType: {
      type: String,
      enum: ["full_length", "sectional", "quiz"],
      required: true,
    },
    tests: [seriesTestItemSchema],

    totalTests: Number, // can be auto-filled based on tests.length
    pricing: seriesPricingSchema,

    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const TestSeries = model("McuTestSeries", testSeriesSchema);
