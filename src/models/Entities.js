import mongoose from "mongoose";

const entitySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        subTitle: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["university", "course"],
            required: true,
        },
        description: {
            type: String,
        },
        country: {
            type: String,
        },
        city: {
            type: String,
        },
        logo: {
            type: String,
        },
        duration: {
            type: String,
        },
        keyFeatures: {
            type: [String],
        },
        slug:{
            type: String,
        },
        studentCount: {
            type: Number,
            default: 0,
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },  

    },
    { timestamps: true }
);

export default mongoose.model("Entity", entitySchema);
