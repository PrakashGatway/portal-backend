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
  startTestAttempt,getTestAttemptById,
  saveTestProgress,
  submitTestAttempt,
  setGmatOrder
} from "../controllers/GGSschema/testAttemptcontroller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/questions", /* requireAuth, */ listQuestions);

router.get("/questions/:id", /* requireAuth, */ getQuestionById);

router.post("/questions", /* requireAdmin, */ createQuestion);
router.post("/questions/bulk", /* requireAdmin, */ bulkCreateQuestions);

// Random questions (for quiz/test generation)
// e.g. /api/questions/random?examId=...&questionType=gmat_verbal_sc&size=10
router.get("/questions/random/list", /* requireAuth, */ getRandomQuestions);

router.put("/questions/:id", /* requireAdmin, */ updateQuestion);

router.delete("/questions/:id", /* requireAdmin, */ deleteQuestion);


// Admin / internal
router.get("/test", /* requireAdmin, */ listTestTemplates);
router.post("/test", /* requireAdmin, */ createTestTemplate);
router.get("/test/:id", /* requireAdmin, */ getTestTemplateById);
router.put("/test/:id", /* requireAdmin, */ updateTestTemplate);
router.delete("/test/:id", /* requireAdmin, */ deleteTestTemplate);

// Public store-style listing
router.get("/public/store", listStoreTests);


// All routes assume user must be authenticated
router.post("/start", protect, startTestAttempt);
router.get("/attempts/:id", protect, getTestAttemptById);
router.patch("/attempts/:id/save-progress", protect, saveTestProgress);
router.post("/attempts/:id/submit", protect, submitTestAttempt);
router.post("/attempts/:id/set-gmat-order", protect, setGmatOrder);




export default router;
