import Feedback from "../models/feedback.js";

export const createFeedback = async (req, res) => {
  try {
    const {
      content,
      module,
      type,
      message,
      issueType,
      description,
      severity,
      specificIssue,
      errorTime,
      isPresentThroughout,
      screenshot,
      contentref,
      rating,
    } = req.body;



    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Video is required",
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Feedback type is required",
      });
    }

    if (!["report_issue", "rate_video"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback type",
      });
    }

    // =========================
    // REPORT ISSUE
    // =========================
    if (type === "report_issue") {
      if (!specificIssue) {
        return res.status(400).json({
          success: false,
          message: "Please select an issue",
        });
      }

      if (!description) {
        return res.status(400).json({
          success: false,
          message: "Please provide issue description",
        });
      }
    }

    // =========================
    // RATE VIDEO
    // =========================
    if (type === "rate_video") {
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }
    }

    // =========================
    // CREATE DATA
    // =========================

    const feedbackData = {
      user : req.user._id,
      content,
      module,
      type,
      message,
      contentref
    };

  
    if (type === "report_issue") {
      feedbackData.issueType = issueType;
      feedbackData.description = description;
      feedbackData.severity = severity || "low";
      feedbackData.specificIssue = specificIssue;

      feedbackData.errorTime = {
        hours: Number(errorTime?.hours) || 0,
        minutes: Number(errorTime?.minutes) || 0,
        seconds: Number(errorTime?.seconds) || 0,
      };

      feedbackData.isPresentThroughout =
        Boolean(isPresentThroughout);

      feedbackData.screenshot = screenshot || null;
      feedbackData.contentref = contentref
    }

   
    if (type === "rate_video") {
      feedbackData.rating = Number(rating);
      feedbackData.description = description;
    }

    const feedback = await Feedback.create(feedbackData);

    return res.status(201).json({
      success: true,
      message:
        type === "report_issue"
          ? "Issue reported successfully"
          : "Video rated successfully",
      data: feedback,
    });
  } catch (error) {
    console.error("Create Feedback Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};




export const getFeedback = async (req, res) => {
  try {
    const { search, contentref, type, severity, page = 1, limit = 10,rating } = req.query;

    const filter = {};

    // Search across message, description, issueType ONLY
    if (search) {
      filter.$or = [
        { message: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { issueType: { $regex: search, $options: "i" } },
        
      ];
    }

    if (contentref) filter.contentref = contentref;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (rating) filter.rating = rating

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Feedback.countDocuments(filter);

    const feedback = await Feedback.find(filter)
      .populate("user", "name email")
      .populate("content", "title description thumbnailPic slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const totalPages = Math.ceil(total / limitNumber);

    return res.status(200).json({
      success: true,
      count: feedback.length,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
      data: feedback,
    });
  } catch (error) {
    console.error("Get Feedback Error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong", error: error.message });
  }
};