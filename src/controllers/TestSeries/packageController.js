import Product from '../../models/Test series/Package.js';

export const getAllProducts = async (req, res) => {
    try {
        const { examId, isActive, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const pipeline = [
            {
                $match: {
                    ...(examId && { examId: new mongoose.Types.ObjectId(examId) })
                }
            },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'examDetails',
                    
                }
            },
            {
                $addFields: {
                    finalPrice: {
                        $cond: {
                            if: { $gt: ["$price.discount", 0] },
                            then: {
                                $subtract: ["$price.amount",
                                    { $multiply: ["$price.amount", { $divide: ["$price.discount", 100] }] }
                                ]
                            },
                            else: "$price.amount"
                        }
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    price: 1,
                    finalPrice: 1,
                    isActive: 1,
                    metadata: 1,
                    exam: { $arrayElemAt: ["$examDetails", 0] },
                    tests: "$testDetails",
                    testCount: { $size: "$testIds" }
                }
            },
        ];

        const products = await Product.aggregate(pipeline);
        const total = await Product.countDocuments({
            isActive: isActive !== undefined ? isActive === 'true' : true,
            ...(examId && { examId: new mongoose.Types.ObjectId(examId) })
        });

        res.status(200).json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }

        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get product by ID with details
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const pipeline = [
            {
                $match: { _id: new mongoose.Types.ObjectId(id) }
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'examDetails'
                }
            },
            {
                $lookup: {
                    from: 'testseries',
                    localField: 'testIds',
                    foreignField: '_id',
                    as: 'testDetails'
                }
            },
            {
                $addFields: {
                    finalPrice: {
                        $cond: {
                            if: { $gt: ["$price.discount", 0] },
                            then: {
                                $subtract: ["$price.amount",
                                    { $multiply: ["$price.amount", { $divide: ["$price.discount", 100] }] }
                                ]
                            },
                            else: "$price.amount"
                        }
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    price: 1,
                    finalPrice: 1,
                    isActive: 1,
                    metadata: 1,
                    exam: { $arrayElemAt: ["$examDetails", 0] },
                    tests: "$testDetails",
                    testCount: { $size: "$testIds" }
                }
            }
        ];

        const product = await Product.aggregate(pipeline);

        if (!product.length) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new product
export const createProduct = async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();

        // Populate the saved product
        const populatedProduct = await Product.findById(product._id)
            .populate('examId')
            .populate('testIds');

        res.status(201).json({
            success: true,
            data: populatedProduct
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update product
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete product
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get products by exam with analytics
export const getProductsByExam = async (req, res) => {
    try {
        const pipeline = [
            {
                $match: { isActive: true }
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            {
                $lookup: {
                    from: 'testseries',
                    localField: 'testIds',
                    foreignField: '_id',
                    as: 'tests'
                }
            },
            {
                $group: {
                    _id: "$examId",
                    examName: { $first: { $arrayElemAt: ["$exam.name", 0] } },
                    products: {
                        $push: {
                            _id: "$_id",
                            name: "$name",
                            price: "$price",
                            finalPrice: {
                                $cond: {
                                    if: { $gt: ["$price.discount", 0] },
                                    then: {
                                        $subtract: ["$price.amount",
                                            { $multiply: ["$price.amount", { $divide: ["$price.discount", 100] }] }
                                        ]
                                    },
                                    else: "$price.amount"
                                }
                            },
                            testCount: { $size: "$testIds" },
                            isActive: "$isActive"
                        }
                    },
                    totalProducts: { $sum: 1 },
                    avgPrice: { $avg: "$price.amount" },
                    avgFinalPrice: {
                        $avg: {
                            $cond: {
                                if: { $gt: ["$price.discount", 0] },
                                then: {
                                    $subtract: ["$price.amount",
                                        { $multiply: ["$price.amount", { $divide: ["$price.discount", 100] }] }
                                    ]
                                },
                                else: "$price.amount"
                            }
                        }
                    }
                }
            },
            {
                $sort: { totalProducts: -1 }
            }
        ];

        const result = await Product.aggregate(pipeline);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Search products
export const searchProducts = async (req, res) => {
    try {
        const { query, minPrice, maxPrice, examId } = req.query;

        const pipeline = [
            {
                $match: {
                    isActive: true,
                    ...(query && {
                        $or: [
                            { name: { $regex: query, $options: 'i' } },
                            { description: { $regex: query, $options: 'i' } }
                        ]
                    }),
                    ...(minPrice && { "price.amount": { $gte: parseFloat(minPrice) } }),
                    ...(maxPrice && { "price.amount": { $lte: parseFloat(maxPrice) } }),
                    ...(examId && { examId: new mongoose.Types.ObjectId(examId) })
                }
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'examDetails'
                }
            },
            {
                $lookup: {
                    from: 'testseries',
                    localField: 'testIds',
                    foreignField: '_id',
                    as: 'testDetails'
                }
            },
            {
                $addFields: {
                    finalPrice: {
                        $cond: {
                            if: { $gt: ["$price.discount", 0] },
                            then: {
                                $subtract: ["$price.amount",
                                    { $multiply: ["$price.amount", { $divide: ["$price.discount", 100] }] }
                                ]
                            },
                            else: "$price.amount"
                        }
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    price: 1,
                    finalPrice: 1,
                    isActive: 1,
                    metadata: 1,
                    exam: { $arrayElemAt: ["$examDetails", 0] },
                    tests: "$testDetails",
                    testCount: { $size: "$testIds" }
                }
            }
        ];

        const products = await Product.aggregate(pipeline);
        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};