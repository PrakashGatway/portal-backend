// routes/mcqQuestion.routes.ts
import { Router } from "express";
import {
  createQuestion,
  bulkCreateQuestions,
  listQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
} from "../controllers/GGSschema/questionController.js";
import {
  createTestTemplate,
  listTestTemplates,
  getTestTemplateById,
  updateTestTemplate,
  deleteTestTemplate,
  listStoreTests,
} from "../controllers/GGSschema/testTemplateController.js";

import {
  startTestAttempt, getTestAttemptById,
  saveTestProgress,
  submitTestAttempt,
  setGmatOrder
} from "../controllers/GGSschema/testAttemptcontroller.js";
import { protect } from "../middleware/auth.js";


import {
  createTestSeries,
  getAllTestSeriesAdmin,
  getPublicTestSeries,
  getTestSeriesById,
  updateTestSeries,
  deleteTestSeries,
  togglePublishSeries,
} from "../controllers/GGSschema/testSeriesController.js";


const router = Router();

router.get("/questions", /* requireAuth, */ listQuestions);
router.get("/questions/:id", /* requireAuth, */ getQuestionById);
router.post("/questions", createQuestion);
router.post("/questions/bulk", bulkCreateQuestions);

// Random questions (for quiz/test generation)
// e.g. /api/questions/random?examId=...&questionType=gmat_verbal_sc&size=10
router.get("/questions/random/list", /* requireAuth, */ getRandomQuestions);
router.put("/questions/:id", updateQuestion);
router.delete("/questions/:id", deleteQuestion);


router.get("/test", protect, listTestTemplates);
router.post("/test", createTestTemplate);
router.get("/test/:id", getTestTemplateById);
router.put("/test/:id", updateTestTemplate);
router.delete("/test/:id", deleteTestTemplate);
// router.get("/public/store", listStoreTests);

router.post("/start", protect, startTestAttempt);
router.get("/attempts/:id", protect, getTestAttemptById);
router.patch("/attempts/:id/save-progress", protect, saveTestProgress);
router.post("/attempts/:id/submit", protect, submitTestAttempt);
router.post("/attempts/:id/set-gmat-order", protect, setGmatOrder);

router.post("/series/", protect, createTestSeries);
router.get("/series/admin", protect, getAllTestSeriesAdmin);
router.get("/series/:id", protect, getTestSeriesById);
router.put("/series/:id", protect, updateTestSeries);
router.delete("/series/:id", protect, deleteTestSeries);
router.patch("/series/:id/toggle", protect, togglePublishSeries);
router.get("/series", protect, getPublicTestSeries);

export default router;
