import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please add the Name."],
            trim: true,
            unique: true,
            maxlength: [50, "Name cannot be more than 50 characters."],
        },
        description: {
            type: String,
            maxlength: [250, "Description cannot be more than 250 characters."],
        },
        key: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
        },
        bannerLayout: {
            type: String,
        },
        Banners: [
            {
                Banner: {
                    file: {
                        type: String,
                        required: false,
                    },
                    alt: {
                        type: String,
                        required: false,
                    },
                },

                subBanner: {
                    file: {
                        type: String,
                    },
                    alt: {
                        type: String,
                    },
                },
            },
        ],
        isActive : Boolean,
        extraData : String,
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Banner", BannerSchema);