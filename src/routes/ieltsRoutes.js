import express from "express";

import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  updateQuestionStatus,
  getQuestionTypes,
  getSources,
  duplicateQuestion,
} from "../controllers/ielts/ieltsQuestions.js";

import {
  createGroupQuestion,
  getGroupQuestions,
  getGroupQuestionById,
  updateGroupQuestion,
  deleteGroupQuestion,
  toggleGroupQuestionStatus,
  getGroupQuestionFilters,
} from "../controllers/ielts/ieltsGroup.js";

import {
  createPassage,
  getPassages,
  getPassageById,
  updatePassage,
  deletePassage,
  getPassageTopics,
} from "../controllers/ielts/ieltsPassage.js";

import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, authorize("teacher", "admin", "manager", "leader"));

router.get("/questions/meta/types", getQuestionTypes);
router.get("/questions/meta/sources", getSources);
router.post("/questions", createQuestion);
router.get("/questions", getQuestions);
router.get("/questions/:id", getQuestionById);
router.put("/questions/:id", updateQuestion);
router.delete("/questions/:id", deleteQuestion);
router.patch("/questions/:id/status", updateQuestionStatus);
router.post("/questions/:id/duplicate", duplicateQuestion);

router.post("/group", createGroupQuestion);
router.get("/group", getGroupQuestions);
router.get("/group/filters", getGroupQuestionFilters);
router.get("/group/:id", getGroupQuestionById);
router.put("/group/:id", updateGroupQuestion);
router.delete("/group/:id", deleteGroupQuestion);
router.patch("/group/:id/toggle-status", toggleGroupQuestionStatus);

// Create passage
router.post("/passages", createPassage);
router.get("/passages", getPassages);
router.get("/passages/topics", getPassageTopics);
router.get("/passages/:id", getPassageById);
router.put("/passages/:id", updatePassage);
router.delete("/passages/:id", deletePassage);

export default router;
