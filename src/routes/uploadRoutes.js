import express from "express";
import upload, { uploadAudio, uploadIeltsAnswerAudio, uploadPteAnswerAudio } from "../middleware/upload.js";
import { uploadSingleImage, uploadMultipleImages, uploadImage, uploadSingleAudio, uploadThumbnail, uploadBlogs } from "../controllers/uploadController.js";
import multer from "multer";
import { protect } from "../middleware/auth.js";
import { uploadBlogImage } from "../middleware/tempUpload.js";

const router = express.Router();

router.post("/single", upload.single("image"), uploadSingleImage);

router.post("/multiple", upload.array("images", 5), uploadMultipleImages);

router.post(
    "/upload_blogs",
    uploadBlogImage.single("image"),
    uploadBlogs
);

const storage = multer.memoryStorage();
const tempUpload = multer({ storage });

router.post("/image", protect, tempUpload.single("file"), uploadThumbnail);

router.post("/cloud", protect, tempUpload.single("file"), uploadImage);

router.post("/audio", protect, uploadAudio.single("file"), uploadSingleAudio);

router.post("/pteupload", protect, uploadPteAnswerAudio.single("file"), uploadSingleAudio);

router.post("/iletsupload", protect, uploadIeltsAnswerAudio.single("file"), uploadSingleAudio);

export default router;