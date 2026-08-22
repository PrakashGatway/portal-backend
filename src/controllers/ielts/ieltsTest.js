import mongoose from "mongoose";
import IeltsTest from "../../models/ielts/ieltsTest.js";

const { Types } = mongoose;

export const createIeltsTest = async (req, res) => {
  try {
    const {
      title,
      slug,
      description,
      instructions,
      category,
      testType,
      difficulty,
      sections,
      totalQuestions,
      duration,
      pricing,
      settings,
      scoring,
      status,
      isFeatured,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!slug?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Slug is required",
      });
    }

    if (!testType) {
      return res.status(400).json({
        success: false,
        message: "Test type is required",
      });
    }

    const existingTest = await IeltsTest.findOne({
      slug: slug.trim().toLowerCase(),
    });

    if (existingTest) {
      return res.status(409).json({
        success: false,
        message: "A test with this slug already exists",
      });
    }

    const test = await IeltsTest.create({
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      description,
      instructions,
      category: category || null,
      testType,
      difficulty,
      sections: sections || [],
      totalQuestions: totalQuestions || 0,
      duration: duration || 0,
      pricing,
      settings,
      scoring,
      status: status || "draft",
      isFeatured: isFeatured || false,
    });

    return res.status(201).json({
      success: true,
      message: "IELTS test created successfully",
      data: test,
    });
  } catch (error) {
    console.error("Create IELTS Test Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Test slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create IELTS test",
      error: error.message,
    });
  }
};

export const getIeltsTests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,

      search,
      testType,
      difficulty,
      status,
      isFeatured,
      category,

      isFree,
      minPrice,
      maxPrice,

      minDuration,
      maxDuration,

      fromDate,
      toDate,

      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const filter = {};

    // =====================================================
    // SEARCH
    // =====================================================

    if (search?.trim()) {
      const searchRegex = {
        $regex: search.trim(),
        $options: "i",
      };

      filter.$or = [
        { title: searchRegex },
        { slug: searchRegex },
        { description: searchRegex },
        { instructions: searchRegex },
      ];
    }

    // =====================================================
    // BASIC FILTERS
    // =====================================================

    if (testType) {
      filter.testType = testType;
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    if (status) {
      filter.status = status;
    }

    if (category) {
      if (!Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      filter.category = category;
    }

    if (isFeatured !== undefined) {
      filter.isFeatured =
        isFeatured === "true";
    }

    // =====================================================
    // PRICING FILTERS
    // =====================================================

    if (isFree !== undefined) {
      filter["pricing.isFree"] =
        isFree === "true";
    }

    if (
      minPrice !== undefined ||
      maxPrice !== undefined
    ) {
      filter["pricing.salePrice"] = {};

      if (minPrice !== undefined) {
        filter["pricing.salePrice"].$gte =
          Number(minPrice);
      }

      if (maxPrice !== undefined) {
        filter["pricing.salePrice"].$lte =
          Number(maxPrice);
      }
    }

    // =====================================================
    // DURATION FILTER
    // =====================================================

    if (
      minDuration !== undefined ||
      maxDuration !== undefined
    ) {
      filter.duration = {};

      if (minDuration !== undefined) {
        filter.duration.$gte =
          Number(minDuration);
      }

      if (maxDuration !== undefined) {
        filter.duration.$lte =
          Number(maxDuration);
      }
    }

    // =====================================================
    // DATE FILTER
    // =====================================================

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

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte = endDate;
      }
    }

    // =====================================================
    // SORT
    // =====================================================

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "title",
      "testType",
      "difficulty",
      "status",
      "duration",
      "totalQuestions",
      "isFeatured",
      "pricing.salePrice",
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

    const safeSortOrder =
      sortOrder === "asc" ? 1 : -1;

    const sort = {
      [safeSortBy]: safeSortOrder,
    };

    // =====================================================
    // QUERY
    // =====================================================

    const [tests, total] =
      await Promise.all([
        IeltsTest.find(filter)
          .populate("category")
          .sort(sort)
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        IeltsTest.countDocuments(filter),
      ]);

    const totalPages = Math.ceil(
      total / limitNumber
    );

    return res.status(200).json({
      success: true,
      message: "IELTS tests fetched successfully",

      data: tests,

      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,

        hasNextPage:
          pageNumber < totalPages,

        hasPreviousPage:
          pageNumber > 1,

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
        testType: testType || null,
        difficulty: difficulty || null,
        status: status || null,
        isFeatured:
          isFeatured !== undefined
            ? isFeatured === "true"
            : null,
        category: category || null,
        isFree:
          isFree !== undefined
            ? isFree === "true"
            : null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        minDuration:
          minDuration || null,
        maxDuration:
          maxDuration || null,
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
    console.error("Get IELTS Tests Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch IELTS tests",
      error: error.message,
    });
  }
};

export const getIeltsTestById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IELTS test ID",
      });
    }

    const test =
      await IeltsTest.findById(id)
        .populate("category")
        .populate({
          path: "sections.groups.group",
        })
        .lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "IELTS test not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "IELTS test fetched successfully",
      data: test,
    });
  } catch (error) {
    console.error(
      "Get IELTS Test By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch IELTS test",
      error: error.message,
    });
  }
};

export const getIeltsTestBySlug = async (
  req,
  res
) => {
  try {
    const { slug } = req.params;

    const test =
      await IeltsTest.findOne({
        slug: slug.toLowerCase(),
      })
        .populate("category")
        .populate({
          path: "sections.groups.group",
        })
        .lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "IELTS test not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "IELTS test fetched successfully",
      data: test,
    });
  } catch (error) {
    console.error(
      "Get IELTS Test By Slug Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch IELTS test",
      error: error.message,
    });
  }
};

export const updateIeltsTest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IELTS test ID",
      });
    }

    const allowedFields = [
      "title",
      "slug",
      "description",
      "instructions",
      "category",
      "testType",
      "difficulty",
      "sections",
      "totalQuestions",
      "duration",
      "pricing",
      "settings",
      "scoring",
      "status",
      "isFeatured",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] =
          field === "slug" &&
          typeof req.body[field] === "string"
            ? req.body[field]
                .trim()
                .toLowerCase()
            : req.body[field];
      }
    }

    if (updateData.slug) {
      const duplicate =
        await IeltsTest.findOne({
          slug: updateData.slug,
          _id: {
            $ne: id,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Another test with this slug already exists",
        });
      }
    }

    const test =
      await IeltsTest.findByIdAndUpdate(
        id,
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("category")
        .populate({
          path: "sections.groups.group",
        });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "IELTS test not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "IELTS test updated successfully",
      data: test,
    });
  } catch (error) {
    console.error(
      "Update IELTS Test Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Test slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update IELTS test",
      error: error.message,
    });
  }
};

export const deleteIeltsTest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IELTS test ID",
      });
    }

    const test =
      await IeltsTest.findByIdAndDelete(id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "IELTS test not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "IELTS test deleted successfully",
      data: {
        id: test._id,
      },
    });
  } catch (error) {
    console.error(
      "Delete IELTS Test Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete IELTS test",
      error: error.message,
    });
  }
};

export const updateIeltsTestStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IELTS test ID",
      });
    }

    const allowedStatuses = [
      "draft",
      "published",
      "archived",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test status",
      });
    }

    const test =
      await IeltsTest.findByIdAndUpdate(
        id,
        {
          $set: {
            status,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "IELTS test not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Test ${status} successfully`,
      data: {
        id: test._id,
        status: test.status,
      },
    });
  } catch (error) {
    console.error(
      "Update IELTS Test Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update test status",
      error: error.message,
    });
  }
};

export const toggleIeltsTestFeatured = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IELTS test ID",
      });
    }

    const test =
      await IeltsTest.findById(id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "IELTS test not found",
      });
    }

    test.isFeatured = !test.isFeatured;

    await test.save();

    return res.status(200).json({
      success: true,
      message: `Test ${
        test.isFeatured
          ? "marked as featured"
          : "removed from featured"
      }`,
      data: {
        id: test._id,
        isFeatured: test.isFeatured,
      },
    });
  } catch (error) {
    console.error(
      "Toggle IELTS Test Featured Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update featured status",
      error: error.message,
    });
  }
};

export const bulkUpdateIeltsTestStatus = async (
  req,
  res
) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IDs array is required",
      });
    }

    if (
      ![
        "draft",
        "published",
        "archived",
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const validIds = ids.filter((id) =>
      Types.ObjectId.isValid(id)
    );

    if (!validIds.length) {
      return res.status(400).json({
        success: false,
        message: "No valid IDs provided",
      });
    }

    const result =
      await IeltsTest.updateMany(
        {
          _id: {
            $in: validIds,
          },
        },
        {
          $set: {
            status,
          },
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "IELTS test statuses updated successfully",
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error(
      "Bulk Update IELTS Test Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update IELTS test statuses",
      error: error.message,
    });
  }
};