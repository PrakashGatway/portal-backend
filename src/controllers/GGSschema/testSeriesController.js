
import mongoose from "mongoose";
import { TestSeries } from "../../models/GGSschema/testSeriesSchema.js";

const { Types } = mongoose;


export const createTestSeries = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      defaultTestType,
      tests = [],
      pricing,
      exam
    } = req.body;

    if (!title || !category || !defaultTestType) {
      return res.status(400).json({
        success: false,
        message: "title, category and defaultTestType are required",
      });
    }

    const series = await TestSeries.create({
      title,
      description,
      category,
      defaultTestType,
      tests,
      exam,
      totalTests: tests.length,
      pricing,
    });

    res.status(201).json({
      success: true,
      data: series,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getAllTestSeriesAdmin = async (req, res) => {
  try {
    const {
      category,
      isActive,
      isPublished,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const match = {};
    if (category) match.category = objectId(category);
    if (isActive && isActive !== undefined) match.isActive = isActive === "true";
    if (isPublished !== undefined) match.isPublished = isPublished === "true";

    const pipeline = [
      { $match: match },

      { $sort: { createdAt: -1 } },

      { $skip: skip },
      { $limit: limitNum },

      {
        $lookup: {
          from: "exams",
          localField: "exam",
          foreignField: "_id",
          as: "exam",
          pipeline: [{ $project: { name: 1, examType: 1 } }],
        },
      },
      { $unwind: "$exam" },
      // {
      //   $lookup: {
      //     from: "testtemplates",
      //     localField: "tests.test",
      //     foreignField: "_id",
      //     as: "testsData",
      //   },
      // },
      // {
      //   $addFields: {
      //     totalTests: { $size: "$tests" },
      //   },
      // },
    ];

    const [data, total] = await Promise.all([
      TestSeries.aggregate(pipeline),
      TestSeries.countDocuments(match),
    ])

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



export const getPublicTestSeries = async (req, res) => {
  try {
    const {
      category,
      page = 1,
      limit = 12, // storefront default
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(parseInt(limit, 10), 50);
    const skip = (pageNum - 1) * limitNum;

    const match = {
      isActive: true,
      isPublished: true,
    };

    if (category) {
      match.category = objectId(category);
    }

    const pipeline = [
      { $match: match },

      { $sort: { createdAt: -1 } },

      { $skip: skip },
      { $limit: limitNum },

      {
        $lookup: {
          from: "exams",
          localField: "exam",
          foreignField: "_id",
          as: "exam",
        },
      },
      { $unwind: "$exam" },

      {
        $addFields: {
          finalPrice: {
            $cond: [
              "$pricing.isFree",
              0,
              { $ifNull: ["$pricing.salePrice", "$pricing.price"] },
            ],
          },
        },
      },

      {
        $project: {
          title: 1,
          description: 1,
          defaultTestType: 1,
          totalTests: { $size: "$tests" },
          exam: {
            _id: 1,
            name: 1,
          },
          pricing: 1,
          finalPrice: 1,
          createdAt: 1,
        },
      },
    ];

    const [data, total] = await Promise.all([
      TestSeries.aggregate(pipeline),
      TestSeries.countDocuments(match),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getTestSeriesById = async (req, res) => {
  try {
    const { id } = req.params;

    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },

      {
        $lookup: {
          from: "testtemplates",
          localField: "tests.test",
          foreignField: "_id",
          as: "testsData",
        },
      },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
    ];

    const result = await TestSeries.aggregate(pipeline);

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "Series not found",
      });
    }

    res.json({ success: true, data: result[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const updateTestSeries = async (req, res) => {
  try {
    const update = req.body;

    if (Array.isArray(update.tests)) {
      update.totalTests = update.tests.length;
    }

    const series = await TestSeries.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!series) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: series });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteTestSeries = async (req, res) => {
  try {
    const series = await TestSeries.findByIdAndDelete(req.params.id);
    if (!series) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const togglePublishSeries = async (req, res) => {
  try {
    const series = await TestSeries.findById(req.params.id);
    if (!series) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    series.isPublished = !series.isPublished;
    await series.save();

    res.json({
      success: true,
      isPublished: series.isPublished,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};