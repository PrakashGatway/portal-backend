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

import {
  createIeltsTest,
  getIeltsTests,
  getIeltsTestById,
  getIeltsTestBySlug,
  updateIeltsTest,
  deleteIeltsTest,
  updateIeltsTestStatus,
  toggleIeltsTestFeatured,
  bulkUpdateIeltsTestStatus
} from "../controllers/ielts/ieltsTest.js";

import {
  startIeltsTest,
  getCurrentIeltsSection,
  startIeltsSection,
  getIeltsGroup,
  submitIeltsGroup,
  startNextIeltsSection,
  submitIeltsSection,
  submitIeltsTest,
  getIeltsAttempt,
  pauseIeltsAttempt,
  resumeIeltsAttempt,
  abandonIeltsAttempt
} from "../controllers/ielts/ieltsAttempts.js";

import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

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

// Create test
router.post("/test", createIeltsTest);
router.get("/test", getIeltsTests);
router.get("/test/slug/:slug", getIeltsTestBySlug);
router.get("/test/:id", getIeltsTestById);
router.put("/test/:id", updateIeltsTest);
router.delete("/test/:id", deleteIeltsTest);
router.patch("/test/:id/status", updateIeltsTestStatus);
router.patch("/test/:id/featured", toggleIeltsTestFeatured);
router.patch("/test/bulk/status", bulkUpdateIeltsTestStatus);

// Attempt
// router.post("/attempts/start", startAttempt);
// router.get("/attempts/my", getMyAttempts);
// router.get("/attempts/:attemptId", getAttempt);
// router.get("/attempts/:attemptId/current", getCurrentQuestion);
// router.post("/attempts/:attemptId/answer", submitAnswer);
// router.post("/attempts/:attemptId/flag", toggleFlag);
// router.post("/attempts/:attemptId/question-time", updateQuestionTime);
// router.post("/attempts/:attemptId/question-set/complete", completeQuestionSet);
// router.post("/attempts/:attemptId/group/complete", completeGroup);
// router.post("/attempts/:attemptId/section/complete", completeSection);
// router.post("/attempts/:attemptId/position", updatePosition);
// router.post("/attempts/:attemptId/pause", pauseAttempt);
// router.post("/attempts/:attemptId/resume", resumeAttempt);
// router.post("/attempts/:attemptId/submit", submitAttempt);

router.post("/attempts/start", startIeltsTest);

// Get attempt
router.get("/attempts/:attemptId", getIeltsAttempt);

// Submit complete test
router.post("/attempts/:attemptId/submit", submitIeltsTest);

/*
|--------------------------------------------------------------------------
| Section
|--------------------------------------------------------------------------
*/

// Get current section
router.get(
  "/attempts/:attemptId/current-section",
  getCurrentIeltsSection,
);

// Start any section
router.post("/attempts/:attemptId/start-section", startIeltsSection);

// Start next section according to test order
router.post(
  "/attempts/:attemptId/start-next-section",
  startNextIeltsSection,
);

// Explicitly submit current section
router.post("/attempts/:attemptId/submit-section", submitIeltsSection);


// Get one group
router.get("/attempts/:attemptId/groups/:groupId", getIeltsGroup);

// Submit COMPLETE group
router.post(
  "/attempts/:attemptId/groups/:groupId/submit",
  submitIeltsGroup,
);

router.post("/attempts/:attemptId/pause", pauseIeltsAttempt);

router.post("/attempts/:attemptId/resume", resumeIeltsAttempt);

router.post("/attempts/:attemptId/abandon", abandonIeltsAttempt);

export default router;
