import express from "express";

import {
  createFeedback,
  getFeedback,
} from "../controllers/feedbackController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Create Report Issue / Rate Video
router.post("/", protect, createFeedback);

// Get feedback
router.get("/", getFeedback);

export default router;