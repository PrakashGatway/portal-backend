import cron from "node-cron";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

import { Session } from "../models/Content.js";

import { Notification, NotificationRec } from "../models/Notification.js";

import User from "../models/User.js";
import CoursePurchase from "../models/PurchasedCourse.js";
import { sendMeetingUrlMail } from "../services/sendMeetingMail.js";
import { sendPushToUsers } from "../services/pushNotitification.js";


const SESSION_REMINDERS = [
  {
    key: "6_hours",
    milliseconds: 6 * 60 * 60 * 1000,
    text: "6 hours",
  },

  {
    key: "30_minutes",
    milliseconds: 30 * 60 * 1000,
    text: "30 minutes",
  },

  {
    key: "5_minutes",
    milliseconds: 5 * 60 * 1000,
    text: "5 minutes",
  },
];

const getCourseStudents = async (courseId) => {
  try {
    const purchases = await CoursePurchase.find({
      itemId: courseId,
      isActive: true,
    }).select("user");
    return purchases.map((purchase) => purchase.user).filter(Boolean);
  } catch (error) {
    console.error("Error getting course students:", error);

    return [];
  }
};

const getSessionRecipients = async (session) => {
  const studentIds = await getCourseStudents(session.course);

  const recipients = [...studentIds, session.instructor].filter(Boolean);

  const uniqueIds = [...new Set(recipients.map((id) => id.toString()))];

  return uniqueIds;
};

const createSessionReminders = async (session) => {
  try {
    if (!session?.scheduledStart) {
      return;
    }

    if (!session?.course) {
      console.log(`Session ${session._id} does not have course`);
      return;
    }

    if (!session?.instructor) {
      console.log(`Session ${session._id} does not have instructor`);
      return;
    }

    const sessionStart = new Date(session.scheduledStart);

    const now = new Date();

    if (sessionStart <= now) {
      return;
    }

    // const recipients = await getSessionRecipients(session);

    // if (!recipients.length) {
    //   return;
    // }

    for (const reminder of SESSION_REMINDERS) {
      const scheduledFor = new Date(
        sessionStart.getTime() - reminder.milliseconds,
      );

      if (scheduledFor <= now) {
        continue;
      }

      const notificationKey =
        `session:${session._id}` + `:reminder:${reminder.key}`;

      const existing = await Notification.findOne({
        notificationKey: notificationKey,
      });

      if (existing) {
        continue;
      }

      await Notification.create({
        isGlobal: false,
        title: `Upcoming Session: ${session.title}`,
        message:
          `Your session "${session.title}" ` +
          `starts in ${reminder.text}. Please be ready to join on time.`,
        type: "reminder",
        priority: reminder.key === "5_minutes" ? "high" : "medium",
        data: {
          courseId: session.course,
          contentId: session._id,
          url: `/sessions/${session.slug}`,
          actionText: "Join Session",
        },
        notificationKey,
        metaInfo: {
          thumbnail: session.thumbnailPic,
        },
        scheduledFor,
      });
    }
    console.log(`Notification Created for session ${session._id}`);
  } catch (error) {
    console.error("Create session reminders error:", error);
  }
};

const sendEmailNotification = async ({ notify, session }) => {
  try {
    const user = notify.user;

    if (!user?.email) {
      return false;
    }

    if (user.notifications && user.notifications.email === false) {
      return false;
    }

    sendMeetingUrlMail({
      to: user?.email,
      student_name: user?.name,
      session_start_time: session?.scheduledStart
        ? new Date(session.scheduledStart).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })
        : "",

      session_end_time: session?.scheduledEnd
        ? new Date(session.scheduledEnd).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })
        : "",
      instructor_name: session?.instructor?.name || "Ooshas Trainer",
      meetingUrl: session?.meetingId,
      title: session?.title,
    });

    return true;
  } catch (error) {
    console.error("Email notification error:", error);

    return false;
  }
};

const processNotification = async (notification) => {
  try {
    if (!notification.data.contentId?._id) {
      return;
    }
    const now = new Date();
    const NotifyUsers = await getSessionRecipients(
      notification?.data?.contentId,
    );

    for (const user of NotifyUsers) {
      const notify = await NotificationRec.create({
        notification: notification._id,
        user: new mongoose.Types.ObjectId(user),
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      });

      await notify.populate([{ path: "user" }, { path: "notification" }]);

      if (!notify?.meta?.email) {
        await sendEmailNotification({
          notify: notify,
          session: notification?.data?.contentId,
        });
        notify.meta.email = true;
      }

      if (!notify?.meta?.push) {
        const sessionPy = notification?.data?.contentId;

        const sessionDate = new Date(
          sessionPy.scheduledStart,
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        });

        const sessionStartTime = new Date(
          sessionPy.scheduledStart,
        ).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        });

        const totalMinutes = Math.floor(sessionPy.duration / 60);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const sessionDuration = hours
          ? `${hours} hour${hours > 1 ? "s" : ""}${
              minutes ? ` ${minutes} minute${minutes > 1 ? "s" : ""}` : ""
            }`
          : `${minutes} minute${minutes > 1 ? "s" : ""}`;

        await sendPushToUsers([user.toString()], {
          title: `Upcoming Session 📅`,
          body: `"${sessionPy.title || "Upcoming Session"}" is scheduled for ${sessionDate} at ${sessionStartTime}. Duration: ${sessionDuration}. Please be ready to join on time.`,
          data: {
            type: "session",
            url: `/sessions/${sessionPy.slug}`,
            actionText: "Join Session"
          },
        });
        notify.meta.push = true;
      }
      await notify.save();
    }

    await Notification.findByIdAndUpdate(
      notification._id,
      {
        $set: {
          proceedStatus: true,
        },
      },
      {
        new: true,
      },
    );

    return true;
  } catch (error) {
    console.error(`Processing notification ${notification._id} failed:`, error);

    return false;
  }
};

const prepareSessionReminders = async () => {
  try {
    const now = new Date();

    const future = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const sessions = await Session.find({
      scheduledStart: {
        $gt: now,
        $lte: future,
      },

      status: {
        $in: ["scheduled", "published", "live"],
      },
    }).lean();

    if (!sessions.length) {
      return;
    }

    for (const session of sessions) {
      await createSessionReminders(session);
    }
  } catch (error) {
    console.error("Prepare session reminders error:", error);
  }
};

const processDueNotifications = async () => {
  try {
    const now = new Date();

    const notifications = await Notification.find({
      type: "reminder",
      scheduledFor: {
        $lte: now,
      },
      isActive: true,
      proceedStatus: {
        $nin: [true],
      },
    }).limit(5)
      .populate("data.courseId", "title description")
      .populate({
        path: "data.contentId",
      });

    if (!notifications.length) {
      return;
    }

    console.log(`Processing ${notifications.length} notifications`);

    for (const notification of notifications) {
      await processNotification(notification);
    }
  } catch (error) {
    console.error("Process due notifications error:", error);
  }
};

const runNotificationCron = async () => {
  console.log(`[Notification Cron] ${new Date().toISOString()}`);

  try {
    await prepareSessionReminders();
    await processDueNotifications();
  } catch (error) {
    console.error("[Notification Cron] Error:", error);
  }
};

export const startNotificationCron = () => {
  cron.schedule(
    "* * * * *",
    async () => {
      await runNotificationCron();
    },
    {
      timezone: process.env.TZ || "Asia/Kolkata",
    },
  );

  console.log("✅ Notification cron started");
};

export { runNotificationCron, createSessionReminders, processDueNotifications };
