import mongoose from "mongoose";
import IeltsGroupQuestion from "../../models/ielts/Grouped.js";

export const createGroupQuestion = async (req, res) => {
  try {
    const {
      section,
      groupType,
      title,
      passage,
      instructions,
      questions,
      content,
      choices,
      media,
      questionRange,
      isActive,
    } = req.body;

    if (!section) {
      return res.status(400).json({
        success: false,
        message: "Section is required",
      });
    }

    const groupQuestion = await IeltsGroupQuestion.create({
      section,
      groupType,
      title,
      instructions,
      questions,
      content,
      passage,
      choices,
      media,
      questionRange,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: "Group question created successfully",
      data: groupQuestion,
    });
  } catch (error) {
    console.error("Create Group Question Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create group question",
      error: error.message,
    });
  }
};

export const getGroupQuestions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,

      search,

      section,
      groupType,
      isActive,

      fromDate,
      toDate,

      sortBy = "createdAt",
      sortOrder = "desc",

      populate = "true",
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};

    // Section
    if (section) {
      filter.section = section;
    }

    // Group type
    if (groupType) {
      filter.groupType = groupType;
    }

    // Active status
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Search
    if (search?.trim()) {
      const searchRegex = {
        $regex: search.trim(),
        $options: "i",
      };

      filter.$or = [
        { title: searchRegex },
        { instructions: searchRegex },
        { content: searchRegex },
        { section: searchRegex },
        { groupType: searchRegex },
      ];
    }

    // Date range
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);

        // Include complete day
        endDate.setHours(23, 59, 59, 999);

        filter.createdAt.$lte = endDate;
      }
    }

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "title",
      "section",
      "groupType",
      "isActive",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const safeSortOrder =
      sortOrder === "asc" ? 1 : -1;

    const sort = {
      [safeSortBy]: safeSortOrder,
    };

    // =================================================
    // QUERY
    // =================================================

    let query = IeltsGroupQuestion.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (populate === "true") {
      query = query.populate({
        path: "questions",
        options: {
          sort: {
            questionNumber: 1,
          },
        },
      });
    }

    const [groupQuestions, total] = await Promise.all([
      query.populate("passage","title topic"),
      IeltsGroupQuestion.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    return res.status(200).json({
      success: true,
      message: "Group questions fetched successfully",

      data: groupQuestions,

      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
        nextPage:
          pageNumber < totalPages
            ? pageNumber + 1
            : null,
        previousPage:
          pageNumber > 1
            ? pageNumber - 1
            : null,
      },

      filters: {
        search: search || null,
        section: section || null,
        groupType: groupType || null,
        isActive:
          isActive !== undefined
            ? isActive === "true"
            : null,
        fromDate: fromDate || null,
        toDate: toDate || null,
      },

      sorting: {
        sortBy: safeSortBy,
        sortOrder:
          safeSortOrder === 1
            ? "asc"
            : "desc",
      },
    });
  } catch (error) {
    console.error("Get Group Questions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group questions",
      error: error.message,
    });
  }
};

export const getGroupQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group question ID",
      });
    }

    const groupQuestion =
      await IeltsGroupQuestion.findById(id)
        .populate({
          path: "questions",
        })
        .lean();

    if (!groupQuestion) {
      return res.status(404).json({
        success: false,
        message: "Group question not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group question fetched successfully",
      data: groupQuestion,
    });
  } catch (error) {
    console.error(
      "Get Group Question By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group question",
      error: error.message,
    });
  }
};

export const updateGroupQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group question ID",
      });
    }

    const allowedFields = [
      "section",
      "groupType",
      "title",
      "passage",
      "instructions",
      "questions",
      "content",
      "choices",
      "media",
      "questionRange",
      "isActive",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const groupQuestion =
      await IeltsGroupQuestion.findByIdAndUpdate(
        id,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate("questions");

    if (!groupQuestion) {
      return res.status(404).json({
        success: false,
        message: "Group question not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group question updated successfully",
      data: groupQuestion,
    });
  } catch (error) {
    console.error(
      "Update Group Question Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update group question",
      error: error.message,
    });
  }
};

export const deleteGroupQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group question ID",
      });
    }

    const deleted =
      await IeltsGroupQuestion.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Group question not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group question deleted successfully",
      data: {
        id: deleted._id,
      },
    });
  } catch (error) {
    console.error(
      "Delete Group Question Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete group question",
      error: error.message,
    });
  }
};

export const toggleGroupQuestionStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group question ID",
      });
    }

    const groupQuestion =
      await IeltsGroupQuestion.findById(id);

    if (!groupQuestion) {
      return res.status(404).json({
        success: false,
        message: "Group question not found",
      });
    }

    groupQuestion.isActive =
      !groupQuestion.isActive;

    await groupQuestion.save();

    return res.status(200).json({
      success: true,
      message: `Group question ${
        groupQuestion.isActive
          ? "activated"
          : "deactivated"
      } successfully`,
      data: {
        id: groupQuestion._id,
        isActive: groupQuestion.isActive,
      },
    });
  } catch (error) {
    console.error(
      "Toggle Group Question Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to toggle group question status",
      error: error.message,
    });
  }
};

export const getGroupQuestionFilters = async (
  req,
  res
) => {
  try {
    const [sections, groupTypes] =
      await Promise.all([
        IeltsGroupQuestion.distinct("section"),
        IeltsGroupQuestion.distinct("groupType"),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        sections,
        groupTypes,
        isActive: [true, false],
      },
    });
  } catch (error) {
    console.error(
      "Get Group Question Filters Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch filters",
      error: error.message,
    });
  }
};