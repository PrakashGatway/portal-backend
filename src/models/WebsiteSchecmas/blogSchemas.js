// const mongoose = require('mongoose');

import mongoose from 'mongoose';
import secondDB from '../../config/webDb.js';


const blogSchema = new mongoose.Schema({
    blogTitle: {
        type: String,
        required: [true, 'Page Name is required'],
    },
    blogDescription: {
        type: String,
        required: [true, 'Page is required'],
    },
    image: {
        type: String,
    },
    Slug: {
        type: String,
    },
    keyword: {
        type: String,
    },
    descriptions: {
        type: String,
    },
    metaDesctiptions: {
        type: String,
    },
    Status: {
        type: Boolean,
        default: true
    },
    category: {
        type: String,
        default: "Education"
    },
    createdBy: {
        type: String,
        default: "Admin"
    },
    viewCount: {
        type: Number,
        default: 0
    },
    review: [
        {
            name: String,
            email: String,
            comment: String,
            status: {
                type: Boolean,
                default: false
            }
        }
    ]

},
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);



const Blog = secondDB.model('Blog', blogSchema);

// module.exports = Blog;
export { Blog };