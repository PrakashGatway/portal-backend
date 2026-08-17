import mongoose from "mongoose";
import IeltsPassage from "../../models/ielts/ieltsPassage.js";

export const createPassage = async (req, res) => {
  try {
    const { title, content, topic } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Passage title is required",
      });
    }

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Passage content is required",
      });
    }

    const passage = await IeltsPassage.create({
      title: title.trim(),
      content,
      topic: topic?.trim() || null,
    });

    return res.status(201).json({
      success: true,
      message: "Passage created successfully",
      data: passage,
    });
  } catch (error) {
    console.error("Create Passage Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create passage",
      error: error.message,
    });
  }
};

export const getPassages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,

      search,
      topic,

      fromDate,
      toDate,

      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    // ---------------------------------------------
    // FILTER
    // ---------------------------------------------

    const filter = {};

    // Search title/content/topic
    if (search?.trim()) {
      const searchRegex = {
        $regex: search.trim(),
        $options: "i",
      };

      filter.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { topic: searchRegex },
      ];
    }

    // Topic
    if (topic?.trim()) {
      filter.topic = {
        $regex: topic.trim(),
        $options: "i",
      };
    }

    // Date filter
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        startDate.setHours(0, 0, 0, 0);

        filter.createdAt.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        endDate.setHours(23, 59, 59, 999);

        filter.createdAt.$lte = endDate;
      }
    }
    const allowedSortFields = ["createdAt", "updatedAt", "title", "topic"];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const safeSortOrder = sortOrder === "asc" ? 1 : -1;

    const sort = {
      [safeSortBy]: safeSortOrder,
    };

    // ---------------------------------------------
    // QUERY
    // ---------------------------------------------

    const [passages, total] = await Promise.all([
      IeltsPassage.find(filter).sort(sort).skip(skip).limit(limitNumber).lean(),

      IeltsPassage.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    return res.status(200).json({
      success: true,
      message: "Passages fetched successfully",

      data: passages,

      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,

        hasNextPage: pageNumber < totalPages,

        hasPreviousPage: pageNumber > 1,

        nextPage: pageNumber < totalPages ? pageNumber + 1 : null,

        previousPage: pageNumber > 1 ? pageNumber - 1 : null,
      },

      filters: {
        search: search || null,
        topic: topic || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
      },

      sorting: {
        sortBy: safeSortBy,
        sortOrder: safeSortOrder === 1 ? "asc" : "desc",
      },
    });
  } catch (error) {
    console.error("Get Passages Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch passages",
      error: error.message,
    });
  }
};

export const getPassageById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid passage ID",
      });
    }

    const passage = await IeltsPassage.findById(id).lean();

    if (!passage) {
      return res.status(404).json({
        success: false,
        message: "Passage not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Passage fetched successfully",
      data: passage,
    });
  } catch (error) {
    console.error("Get Passage By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch passage",
      error: error.message,
    });
  }
};

export const updatePassage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid passage ID",
      });
    }

    const allowedFields = ["title", "content", "topic"];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] =
          typeof req.body[field] === "string"
            ? req.body[field].trim()
            : req.body[field];
      }
    }

    if (updateData.title !== undefined && !updateData.title) {
      return res.status(400).json({
        success: false,
        message: "Passage title cannot be empty",
      });
    }

    if (updateData.content !== undefined && !updateData.content) {
      return res.status(400).json({
        success: false,
        message: "Passage content cannot be empty",
      });
    }

    const passage = await IeltsPassage.findByIdAndUpdate(
      id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!passage) {
      return res.status(404).json({
        success: false,
        message: "Passage not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Passage updated successfully",
      data: passage,
    });
  } catch (error) {
    console.error("Update Passage Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update passage",
      error: error.message,
    });
  }
};

export const deletePassage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid passage ID",
      });
    }

    const passage = await IeltsPassage.findByIdAndDelete(id);

    if (!passage) {
      return res.status(404).json({
        success: false,
        message: "Passage not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Passage deleted successfully",
      data: {
        id: passage._id,
      },
    });
  } catch (error) {
    console.error("Delete Passage Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete passage",
      error: error.message,
    });
  }
};

export const getPassageTopics = async (req, res) => {
  try {
    const topics = await IeltsPassage.distinct("topic");

    const filteredTopics = topics
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      data: filteredTopics,
    });
  } catch (error) {
    console.error("Get Passage Topics Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch passage topics",
      error: error.message,
    });
  }
};
