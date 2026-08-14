import Feedback from "../models/feedback.js";

export const createFeedback = async (req, res) => {
  try {
    const {
      user,
      video,
      module,
      type,
      message,

      // Report Issue
      issueType,
      description,
      severity,
      specificIssue,
      errorTime,
      isPresentThroughout,
      screenshot,

      // Rate Video
      rating,
    } = req.body;

    // Basic validation
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User is required",
      });
    }

    if (!video) {
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
      user,
      video,
      module,
      type,
      message,
    };

    // Add report issue fields
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
    }

    // Add rating fields
    if (type === "rate_video") {
      feedbackData.rating = Number(rating);
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
    const { type, video, user } = req.query;

    const filter = {};

    if (type) {
      filter.type = type;
    }

    if (video) {
      filter.video = video;
    }

    if (user) {
      filter.user = user;
    }

    const feedback = await Feedback.find(filter)
      .populate("user", "name email")
      .populate("video")
      .populate("module")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedback.length,
      data: feedback,
    });
  } catch (error) {
    console.error("Get Feedback Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};