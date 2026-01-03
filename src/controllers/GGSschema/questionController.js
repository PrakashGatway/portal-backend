// controllers/mcqQuestion.controller.ts
import mongoose from "mongoose";
import { Question } from "../../models/GGSschema/questionSchema.js"; // adjust path
import Exam from "../../models/Test series/Exams.js";
import { Section } from "../../models/Test series/Sections.js";

const { Types } = mongoose;

// Helper: build filter object from query params
const buildQuestionMatch = (query) => {
  const {
    examId,
    sectionId,
    questionType,
    difficulty,
    tag,
    search,
  } = query;

  const match = {};

  if (examId && Types.ObjectId.isValid(examId)) {
    match.exam = new Types.ObjectId(examId);
  }

  if (sectionId && Types.ObjectId.isValid(sectionId)) {
    match.section = new Types.ObjectId(sectionId);
  }

  if (questionType) {
    // support multiple comma-separated types
    const types = String(questionType).split(",").map((t) => t.trim());
    match.questionType = { $in: types };
  }

  if (difficulty) {
    const diff = String(difficulty).split(",").map((d) => d.trim());
    match.difficulty = { $in: diff };
  }

  if (tag) {
    const tags = String(tag).split(",").map((t) => t.trim());
    match.tags = { $in: tags };
  }

  if (search) {
    // text search on questionText + optional stimulus
    match.$or = [
      { questionText: { $regex: search, $options: "i" } },
      { stimulus: { $regex: search, $options: "i" } },
      { source: { $regex: search, $options: "i" } },
    ];
  }

  return match;
};

/**
 * POST /api/questions
 * Create a single MCQ / question
 */
export const createQuestion = async (req, res) => {
  try {
    const {
      exam,
      section,
      questionType,
      questionText,
      options,
      correctAnswerText,
      difficulty,
      tags,
      stimulus,
      typeSpecific,
      marks,
      negativeMarks,
      explanation,
      source,
      dataInsights
    } = req.body;

    if (!exam || !section || !questionType || !questionText) {
      return res.status(400).json({
        success: false,
        message: "exam, section, questionType and questionText are required",
      });
    }

    // optional: ensure exam & section exist
    const [examDoc, sectionDoc] = await Promise.all([
      Exam.findById(exam).lean(),
      Section.findById(section).lean(),
    ]);

    if (!examDoc) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }
    if (!sectionDoc) {
      return res.status(404).json({ success: false, message: "Section not found" });
    }

    const question = await Question.create({
      exam,
      section,
      questionType,
      questionText,
      options,
      correctAnswerText,
      difficulty,
      tags,
      stimulus,
      typeSpecific,
      marks,
      negativeMarks,
      explanation,
      source,
      dataInsights
    });

    return res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: question,
    });
  } catch (err) {
    console.error("createQuestion error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create question",
      error: err.message,
    });
  }
};

/**
 * POST /api/questions/bulk
 * Create many questions at once
 */
export const bulkCreateQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "questions[] is required" });
    }

    const created = await Question.insertMany(questions, { ordered: false });

    return res.status(201).json({
      success: true,
      message: `Inserted ${created.length} questions`,
      data: created,
    });
  } catch (err) {
    console.error("bulkCreateQuestions error:", err);
    return res.status(500).json({
      success: false,
      message: "Bulk insert failed",
      error: err.message,
    });
  }
};

/**
 * GET /api/questions
 * List questions with filters, pagination & aggregation
 */
export const listQuestions = async (req, res) => {
  try {
    let { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } =
      req.query;

    const match = buildQuestionMatch(req.query);

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
          from: "sections",
          localField: "section",
          foreignField: "_id",
          as: "section",
        },
      },
      { $unwind: "$section" },
      {
        // avoid sending super heavy fields if you want
        $project: {
          "exam.description": 0,
          "section.description": 0,
          "section.instructions": 0,
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

    const aggResult = await Question.aggregate(pipeline);
    const result = aggResult[0] || { data: [], meta: [] };
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
    console.error("listQuestions error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: err.message,
    });
  }
};

/**
 * GET /api/questions/:id
 * Get one question with exam + section using aggregation
 */
export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid question id" });
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
          from: "sections",
          localField: "section",
          foreignField: "_id",
          as: "section",
        },
      },
      { $unwind: "$section" },
    ];

    const [question] = await Question.aggregate(pipeline);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    return res.json({ success: true, data: question });
  } catch (err) {
    console.error("getQuestionById error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch question",
      error: err.message,
    });
  }
};

/**
 * PUT /api/questions/:id
 * Update question
 */
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid question id" });
    }

    const updated = await Question.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    return res.json({
      success: true,
      message: "Question updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("updateQuestion error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update question",
      error: err.message,
    });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid question id" });
    }

    const deleted = await Question.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    return res.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (err) {
    console.error("deleteQuestion error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete question",
      error: err.message,
    });
  }
};

export const getRandomQuestions = async (req, res) => {
  try {
    const match = buildQuestionMatch(req.query);
    const size = Number(req.query.size) || 10;

    const pipeline = [
      { $match: match },
      { $sample: { size } },
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
          from: "sections",
          localField: "section",
          foreignField: "_id",
          as: "section",
        },
      },
      { $unwind: "$section" },
    ];

    const questions = await Question.aggregate(pipeline);

    return res.json({
      success: true,
      data: questions,
      count: questions.length,
    });
  } catch (err) {
    console.error("getRandomQuestions error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch random questions",
      error: err.message,
    });
  }
};
