import express from "express";

import {
  createFeedback,
  getFeedback,
} from "../controllers/feedback.controller.js";

const router = express.Router();

// Create Report Issue / Rate Video
router.post("/", createFeedback);

// Get feedback
router.get("/", getFeedback);

export default router;