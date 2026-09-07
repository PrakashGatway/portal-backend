import express from "express";

import {
  createNotification,
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotifications,
  deleteNotification,
  deleteNotificationForEveryone,
  saveToken,
  testSendPush
} from "../controllers/notificationController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createNotification);

router.get("/all", protect, getNotifications);

router.get("/my", protect, getMyNotifications);

router.get("/unread-count", protect, getUnreadNotificationCount);

router.put("/read-all", protect, markAllNotificationsAsRead);

router.put("/:notificationId/read", protect, markNotificationAsRead);

router.delete("/:notificationId", protect, deleteNotification);

router.post('/fcm-token',saveToken);

router.delete(
  "/admin/:notificationId",
  protect,
  deleteNotificationForEveryone
);

router.post('/testSendPush',testSendPush);


export default router;