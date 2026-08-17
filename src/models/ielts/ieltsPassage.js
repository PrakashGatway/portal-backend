import mongoose from "mongoose";

const passageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    topic: {
      type: String,
      default: null,
      trim: true,
    }
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("IeltsPassage", passageSchema);
