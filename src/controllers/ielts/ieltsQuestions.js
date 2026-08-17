import mongoose from "mongoose";
import IELTSQuestion from "../../models/ielts/Questions.js";

const { isValidObjectId } = mongoose;

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (page, limit) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.min(
    Math.max(parseInt(limit, 10) || 20, 1),
    100
  );

  return {
    page: currentPage,
    limit: perPage,
    skip: (currentPage - 1) * perPage,
  };
};

const sendError = (res, status, message, error = null) => {
  return res.status(status).json({
    success: false,
    message,
    ...(error && {
      error: error.message || error,
    }),
  });
};


export const createQuestion = async (req, res) => {
  try {
    const question = await IELTSQuestion.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: question,
    });
  } catch (error) {
    console.error("createQuestion:", error);

    return sendError(
      res,
      500,
      "Failed to create question",
      error
    );
  }
};

export const getQuestions = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      section,
      questionType,
      difficulty,
      isActive,
      source,
      minMarks,
      maxMarks,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const {
      page: currentPage,
      limit: perPage,
      skip,
    } = getPagination(page, limit);

    const filter = {};

    if (section) {
      const sections = section
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      filter.section =
        sections.length > 1
          ? { $in: sections }
          : sections[0];
    }

    if (questionType) {
      const types = questionType
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      filter.questionType =
        types.length > 1
          ? { $in: types }
          : types[0];
    }

    if (difficulty) {
      const difficulties = difficulty
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      filter["metadata.difficulty"] =
        difficulties.length > 1
          ? { $in: difficulties }
          : difficulties[0];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (source?.trim()) {
      filter.source = {
        $regex: escapeRegex(source.trim()),
        $options: "i",
      };
    }

    if (minMarks || maxMarks) {
      filter.marks = {};

      if (minMarks && !Number.isNaN(Number(minMarks))) {
        filter.marks.$gte = Number(minMarks);
      }

      if (maxMarks && !Number.isNaN(Number(maxMarks))) {
        filter.marks.$lte = Number(maxMarks);
      }
    }

    if (search?.trim()) {
      const regex = {
        $regex: escapeRegex(search.trim()),
        $options: "i",
      };

      filter.$or = [
        { content: regex },
        { instructions: regex },
        { source: regex },
        { "metadata.topic": regex },
        { "metadata.taskType": regex },
      ];
    }
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "marks",
      "section",
      "questionType",
      "metadata.difficulty",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const safeSortOrder =
      sortOrder === "asc" ? 1 : -1;

    const sort = {
      [safeSortBy]: safeSortOrder,
    };
    const [questions, total] = await Promise.all([
      IELTSQuestion.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(perPage)
        .lean(),

      IELTSQuestion.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return res.status(200).json({
      success: true,

      data: questions,

      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },

      filters: {
        search: search || null,
        section: section || null,
        questionType: questionType || null,
        difficulty: difficulty || null,
        isActive:
          isActive !== undefined
            ? isActive === "true"
            : null,
        source: source || null,
        minMarks: minMarks || null,
        maxMarks: maxMarks || null,
      },
    });
  } catch (error) {
    console.error("getQuestions:", error);

    return sendError(
      res,
      500,
      "Failed to fetch questions",
      error
    );
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid question ID"
      );
    }

    const question = await IELTSQuestion.findById(id)

    if (!question) {
      return sendError(
        res,
        404,
        "Question not found"
      );
    }

    return res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    console.error("getQuestionById:", error);

    return sendError(
      res,
      500,
      "Failed to fetch question",
      error
    );
  }
};
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid question ID"
      );
    }

    const question =
      await IELTSQuestion.findByIdAndUpdate(
        id,
        { $set: req.body },
        {
          new: true,
          runValidators: true,
        }
      )

    if (!question) {
      return sendError(
        res,
        404,
        "Question not found"
      );
    }

    return res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: question,
    });
  } catch (error) {
    console.error("updateQuestion:", error);

    return sendError(
      res,
      500,
      "Failed to update question",
      error
    );
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid question ID"
      );
    }

    const question =
      await IELTSQuestion.findByIdAndDelete(id);

    if (!question) {
      return sendError(
        res,
        404,
        "Question not found"
      );
    }

    return res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("deleteQuestion:", error);

    return sendError(
      res,
      500,
      "Failed to delete question",
      error
    );
  }
};


export const updateQuestionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid question ID"
      );
    }

    if (typeof isActive !== "boolean") {
      return sendError(
        res,
        400,
        "isActive must be a boolean"
      );
    }

    const question =
      await IELTSQuestion.findByIdAndUpdate(
        id,
        { $set: { isActive } },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!question) {
      return sendError(
        res,
        404,
        "Question not found"
      );
    }

    return res.status(200).json({
      success: true,
      message: `Question ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: question,
    });
  } catch (error) {
    console.error("updateQuestionStatus:", error);

    return sendError(
      res,
      500,
      "Failed to update question status",
      error
    );
  }
};

export const getQuestionTypes = async (req, res) => {
  try {
    const types =
      await IELTSQuestion.distinct("questionType");

    return res.status(200).json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error("getQuestionTypes:", error);

    return sendError(
      res,
      500,
      "Failed to fetch question types",
      error
    );
  }
};


export const getSources = async (req, res) => {
  try {
    const sources =
      await IELTSQuestion.distinct("source", {
        source: {
          $nin: [null, ""],
        },
      });

    return res.status(200).json({
      success: true,
      data: sources,
    });
  } catch (error) {
    console.error("getSources:", error);

    return sendError(
      res,
      500,
      "Failed to fetch sources",
      error
    );
  }
};

export const duplicateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid question ID"
      );
    }

    const original =
      await IELTSQuestion.findById(id).lean();

    if (!original) {
      return sendError(
        res,
        404,
        "Question not found"
      );
    }

    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;

    // Duplicate should not automatically become active
    original.isActive = false;

    const duplicate =
      await IELTSQuestion.create(original);

    return res.status(201).json({
      success: true,
      message: "Question duplicated successfully",
      data: duplicate,
    });
  } catch (error) {
    console.error("duplicateQuestion:", error);

    return sendError(
      res,
      500,
      "Failed to duplicate question",
      error
    );
  }
};