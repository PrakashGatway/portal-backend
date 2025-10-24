import { Schema, model } from 'mongoose';

const productSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        testIds: [{
            type: Schema.Types.ObjectId,
            ref: 'TestSeries',
            required: true,
        }],
        examId: {
            type: Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
        },
        price: {
            amount: {
                type: Number,
                min: 0,
                required: true,
            },
            discount: {
                type: Number,
                min: 0,
            },
            currency: {
                type: String,
                default: 'INR',
                uppercase: true,
                match: /^[A-Z]{3}$/,
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        metadata: {
            bundleSize: Number,
            validityDays: Number,
        }
    },
    {
        timestamps: true,
    }
);

productSchema.index({ examId: 1, type: 1, isActive: 1 });
productSchema.index({ 'testIds': 1 });

const Product = model('Package', productSchema);
export default Product;