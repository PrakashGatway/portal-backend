// routes/content.js
import express from "express";
import {
  getAllContent,
  getContentByType,
  getContent,
  createLiveClass,
  createRecordedClass,
  createStudyMaterial,
  updateContent,
  deleteContent,
  getContentStats,
  getUpcomingLiveClasses,
  getCourseContentStructure,
  updateContentStatus,
  getFreeStudyMaterials,
  getContentBySlug,
  createSession,
  createTest,
  getCalendarClasses,
} from "../controllers/contentController.js";

import {
  protect,
  authorize,
  ensureCoursePurchase,
  ensurePurchased,
} from "../middleware/auth.js";

const router = express.Router();

router.route("/").get(protect, authorize("teacher", "admin"), getAllContent);

router.route("/resources").get(getFreeStudyMaterials);

router.route("/resources/:slug").get(protect, getContentBySlug);

router.route("/stats").get(getContentStats);

router.route("/type/:type").get(getContentByType);

router.route("/liveclass/upcoming").get(getUpcomingLiveClasses);

router
  .route("/course/:courseId/structure")
  .get(protect, getCourseContentStructure);

router.route("/slug/:slug").get(protect, ensurePurchased, getContent);

router
  .route("/liveclass")
  .post(protect, authorize("teacher", "admin"), createLiveClass);

router
  .route("/sessions")
  .post(protect, authorize("teacher", "admin"), createSession);

router
  .route("/recordedclass")
  .post(protect, authorize("teacher", "admin"), createRecordedClass);

router
  .route("/studymaterial")
  .post(protect, authorize("teacher", "admin"), createStudyMaterial);

router.route("/test").post(protect, authorize("teacher", "admin"), createTest);

router.route("/schedule").get(getCalendarClasses);

router
  .route("/:id")
  .put(protect, authorize("teacher", "admin"), updateContent)
  .delete(protect, authorize("admin"), deleteContent);

router
  .route("/status/:id")
  .put(protect, authorize("teacher", "admin"), updateContentStatus);

router.route("/:id/:courseId").get(protect, ensureCoursePurchase, getContent);

export default router;
