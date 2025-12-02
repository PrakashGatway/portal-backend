// controllers/testSeries.controller.js
import TestSeries from "../models/testSeries.model.js";
import { buildPaginationStages } from "../utils/pagination.js";
import mongoose from "mongoose";

const { Types } = mongoose;

// CREATE – POST /api/test-series
export const createTestSeries = async (req, res) => {
  try {
    const series = await TestSeries.create({
      ...req.body,
      totalTests: req.body.tests?.length || 0,
    });
    res.status(201).json({ success: true, data: series });
  } catch (err) {
    console.error("createTestSeries error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// LIST – GET /api/test-series
export const listTestSeries = async (req, res) => {
  try {
    const { examId, isFree, search, page = 1, limit = 10 } = req.query;
    const match = {};

    if (examId && Types.ObjectId.isValid(examId)) {
      match.exam = new Types.ObjectId(examId);
    }
    if (typeof isFree !== "undefined") {
      match["pricing.isFree"] = isFree === "true";
    }
    if (search) {
      match.title = { $regex: search, $options: "i" };
    }

    const pipeline = [
      { $match: match },
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
          isFree: "$pricing.isFree",
          price: "$pricing.price",
          salePrice: "$pricing.salePrice",
        },
      },
      {
        $project: {
          "exam.sections": 0,
          tests: 0, // for listing, we only want meta
        },
      },
      ...buildPaginationStages({ page, limit, sort: { createdAt: -1 } }),
    ];

    const agg = await TestSeries.aggregate(pipeline);
    const result = agg[0] || { data: [], meta: [] };
    const total = result.meta[0]?.total || 0;
    const pages = Math.ceil(total / result.limit || 1);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total,
        page: result.page,
        limit: result.limit,
        pages,
      },
    });
  } catch (err) {
    console.error("listTestSeries error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DETAIL – GET /api/test-series/:id
export const getTestSeriesById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid series id" });
    }

    const pipeline = [
      { $match: { _id: new Types.ObjectId(id) } },
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
        $lookup: {
          from: "testtemplates",
          let: { testItems: "$tests" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", { $map: { input: "$$testItems", as: "ti", in: "$$ti.test" } }],
                },
              },
            },
            {
              $project: {
                title: 1,
                exam: 1,
                testType: 1,
                "pricing.isFree": 1,
                "pricing.price": 1,
                totalDurationMinutes: 1,
                totalQuestions: 1,
              },
            },
          ],
          as: "testDocs",
        },
      },
    ];

    const [series] = await TestSeries.aggregate(pipeline);
    if (!series) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }

    res.json({ success: true, data: series });
  } catch (err) {
    console.error("getTestSeriesById error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE – PUT /api/test-series/:id
export const updateTestSeries = async (req, res) => {
  try {
    const body = {
      ...req.body,
    };
    if (body.tests) {
      body.totalTests = body.tests.length;
    }

    const updated = await TestSeries.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateTestSeries error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE – DELETE /api/test-series/:id
export const deleteTestSeries = async (req, res) => {
  try {
    const deleted = await TestSeries.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Series not found" });
    }
    res.json({ success: true, message: "Series deleted" });
  } catch (err) {
    console.error("deleteTestSeries error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
