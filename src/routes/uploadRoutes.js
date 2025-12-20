import express from "express";
import upload, { uploadAnswers, uploadAudio } from "../middleware/upload.js";
import { uploadSingleImage, uploadMultipleImages, uploadImage, uploadSingleAudio } from "../controllers/uploadController.js";
import multer from "multer";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/single", upload.single("image"), uploadSingleImage);

router.post("/multiple", upload.array("images", 5), uploadMultipleImages);

const storage = multer.memoryStorage();
const tempUpload = multer({ storage });

router.post("/cloud", protect, tempUpload.single("file"), uploadImage);

router.post("/audio", protect, uploadAudio.single("file"), uploadSingleAudio);

router.post("/answerAudio", protect, uploadAnswers.single("file"), uploadSingleAudio);

export default router;