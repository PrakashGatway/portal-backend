import express from 'express';
import {
  createLiveEvent,
  startLiveEvent,
  stopLiveEvent,
  getLiveEventDetails,
  uploadVideo,
  getVideoDetails,
  getEmbedCode,
  deleteVideo,
  updateVideo,
  getUserVideos,
  create360Video,
  get360VideoControls,
  verifyVimeoUpload
} from '../controllers/vimeoController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// router.use(protect);

router.post('/live-events', createLiveEvent);
router.patch('/live-events/:eventId/start', startLiveEvent);
router.patch('/live-events/:eventId/stop', stopLiveEvent);
router.get('/live-events/:eventId', getLiveEventDetails);

router.post('/videos/upload', uploadVideo);
router.get("/videos/status/:videoUri", verifyVimeoUpload)
router.get('/videos/:videoId', getVideoDetails);
router.get('/videos/:videoId/embed', getEmbedCode);
router.delete('/videos/:videoId', deleteVideo);
router.patch('/videos/:videoId', updateVideo);
router.get('/videos', getUserVideos);

export default router;