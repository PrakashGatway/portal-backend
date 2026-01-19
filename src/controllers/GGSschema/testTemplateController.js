import mongoose from "mongoose";
import { TestTemplate } from "../../models/GGSschema/testTemplate.js";
import Exam from "../../models/Test series/Exams.js";

const { Types } = mongoose;

const buildTestTemplateMatch = (query) => {
  const {
    examId,
    testType,
    isActive,
    isFree,
    isSellable,
    seriesOnly,
    search,
    difficultyLabel,
  } = query;

  const match = {};

  if (examId && Types.ObjectId.isValid(examId)) {
    match.exam = new Types.ObjectId(examId);
  }

  if (testType) {
    const types = String(testType).split(",").map((t) => t.trim());
    match.testType = { $in: types };
  }

  if (difficultyLabel) {
    const diff = String(difficultyLabel).split(",").map((d) => d.trim());
    match.difficultyLabel = { $in: diff };
  }

  if (typeof isActive !== "undefined") {
    match.isActive = isActive === "true" || isActive === true;
  }

  if (typeof isFree !== "undefined") {
    match["pricing.isFree"] = isFree === "true" || isFree === true;
  }

  if (typeof isSellable !== "undefined") {
    match["pricing.isSellable"] =
      isSellable === "true" || isSellable === true;
  }

  if (typeof seriesOnly !== "undefined") {
    match["pricing.seriesOnly"] =
      seriesOnly === "true" || seriesOnly === true;
  }

  if (search) {
    match.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  return match;
};

const computeTotals = (body) => {
  let totalDurationMinutes = 0;
  let totalQuestions = 0;

  if (body.testType === "quiz") {
    if (body.quizConfig) {
      totalDurationMinutes = body.quizConfig.durationMinutes || 0;
      totalQuestions = body.quizConfig.totalQuestions || 0;
    }
  } else {
    // full_length or sectional
    if (Array.isArray(body.sections)) {
      for (const sec of body.sections) {
        // duration
        if (sec.durationMinutes) {
          totalDurationMinutes += Number(sec.durationMinutes) || 0;
        }

        // question count
        if (typeof sec.questionCount === "number") {
          totalQuestions += sec.questionCount;
        } else if (sec.randomConfig?.questionCount) {
          totalQuestions += sec.randomConfig.questionCount;
        } else if (Array.isArray(sec.questions)) {
          totalQuestions += sec.questions.length;
        }
      }
    }
  }

  return { totalDurationMinutes, totalQuestions };
};

export const createTestTemplate = async (req, res) => {
  try {
    const body = req.body;

    if (!body.title || !body.exam || !body.testType) {
      return res.status(400).json({
        success: false,
        message: "title, exam and testType are required",
      });
    }

    const exam = await Exam.findById(body.exam).lean();
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    if (body.sections && !Array.isArray(body.sections)) {
      return res.status(400).json({
        success: false,
        message: "sections must be an array",
      });
    }

    const { totalDurationMinutes, totalQuestions } = computeTotals(body);

    const doc = await TestTemplate.create({
      ...body,
      totalDurationMinutes,
      totalQuestions,
    });

    return res.status(201).json({
      success: true,
      message: "Test template created",
      data: doc,
    });
  } catch (err) {
    console.error("createTestTemplate error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create test template",
      error: err.message,
    });
  }
};

export const listTestTemplates = async (req, res) => {
  try {
    const match = buildTestTemplateMatch(req.query);

    let {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      isActive = "true",
    } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

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
        $lookup: {
          from: "testseries",
          localField: "series",
          foreignField: "_id",
          as: "seriesDocs",
        },
      },
      {
        $addFields: {
          sectionCount: { $size: { $ifNull: ["$sections", []] } },
          isFree: "$pricing.isFree",
          isSellable: "$pricing.isSellable",
          seriesOnly: "$pricing.seriesOnly",
          price: "$pricing.price",
          salePrice: "$pricing.salePrice",
        },
      },
      {
        $project: {
          "exam.description": 0,
          "exam.sections": 0,
          "seriesDocs.tests": 0,
          quizConfig: 0, // hide heavy config in list
          sections: 0,   // list view doesn’t need full section config
        },
      },
      { $sort: sort },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          meta: [{ $count: "total" }],
        },
      },
    ];

    const agg = await TestTemplate.aggregate(pipeline);
    const result = agg[0] || { data: [], meta: [] };
    const total = result.meta[0]?.total || 0;
    const pages = Math.ceil(total / limitNum || 1);

    return res.json({
      success: true,
      data: result.data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages,
      },
    });
  } catch (err) {
    console.error("listTestTemplates error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tests",
      error: err.message,
    });
  }
};

export const getTestTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid test id" });
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
          from: "testseries",
          localField: "series",
          foreignField: "_id",
          as: "seriesDocs",
        },
      },
      {
        $addFields: {
          sectionCount: { $size: { $ifNull: ["$sections", []] } },
          isFree: "$pricing.isFree",
          isSellable: "$pricing.isSellable",
          seriesOnly: "$pricing.seriesOnly",
        },
      },
    ];

    const [test] = await TestTemplate.aggregate(pipeline);
    if (!test) {
      return res
        .status(404)
        .json({ success: false, message: "Test template not found" });
    }

    return res.json({ success: true, data: test });
  } catch (err) {
    console.error("getTestTemplateById error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch test template",
      error: err.message,
    });
  }
};


export const updateTestTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid test id" });
    }

    const body = req.body;

    if (body.exam) {
      const exam = await Exam.findById(body.exam).lean();
      if (!exam) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });
      }
    }

    const { totalDurationMinutes, totalQuestions } = computeTotals(body);

    const updated = await TestTemplate.findByIdAndUpdate(
      id,
      {
        ...body,
        totalDurationMinutes:
          body.totalDurationMinutes ?? totalDurationMinutes,
        totalQuestions: body.totalQuestions ?? totalQuestions,
      },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Test template not found" });
    }

    return res.json({
      success: true,
      message: "Test template updated",
      data: updated,
    });
  } catch (err) {
    console.error("updateTestTemplate error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update test template",
      error: err.message,
    });
  }
};

export const deleteTestTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid test id" });
    }

    const deleted = await TestTemplate.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Test template not found" });
    }

    return res.json({
      success: true,
      message: "Test template deleted",
    });
  } catch (err) {
    console.error("deleteTestTemplate error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete test template",
      error: err.message,
    });
  }
};

export const listStoreTests = async (req, res) => {
  try {
    const match = {
      isActive: true,
      "pricing.isSellable": true,
    };

    if (typeof req.query.isFree !== "undefined") {
      match["pricing.isFree"] =
        req.query.isFree === "true" || req.query.isFree === true;
    }

    if (req.query.examId && Types.ObjectId.isValid(req.query.examId)) {
      match.exam = new Types.ObjectId(req.query.examId);
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
          sectionCount: { $size: { $ifNull: ["$sections", []] } },
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          exam: { _id: 1, name: 1 },
          testType: 1,
          difficultyLabel: 1,
          totalDurationMinutes: 1,
          totalQuestions: 1,
          isFree: 1,
          price: 1,
          salePrice: 1,
          sectionCount: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    const data = await TestTemplate.aggregate(pipeline);

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("listStoreTests error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch store tests",
      error: err.message,
    });
  }
};