import express from "express";

import {
    createNotification,
    getMyNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    archiveNotification,
    getNotifications,
    deleteNotification,
} from "../controllers/notificationController.js";
import { protect } from '../middleware/auth.js';

const router = express.Router();


router.post("/", createNotification);

router.get('/all', getNotifications)

router.get("/", protect, getMyNotifications);

router.get("/unread-count", protect, getUnreadNotificationCount);

router.put("/read-all", protect, markAllNotificationsAsRead);

router.put("/:id/read", protect, markNotificationAsRead);

router.put("/:id/archive", protect, archiveNotification);

router.delete("/:id", protect, deleteNotification);

export default router;