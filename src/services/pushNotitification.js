import { messaging } from "../config/firebase.js";
import User from "../models/User.js";

const FCM_BATCH_LIMIT = 500;

function normalizeData(data = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      String(key),
      value === null || value === undefined ? "" : String(value),
    ]),
  );
}

export async function sendPushToUsers(
  userIds,
  { title, body, data = {} } = {},
) {
  const results = new Map();

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return results;
  }

  const uniqueUserIds = [...new Set(userIds.filter(Boolean).map(String))];

  uniqueUserIds.forEach((id) => {
    results.set(id, { status: "no_token" });
  });

  for (let i = 0; i < uniqueUserIds.length; i += FCM_BATCH_LIMIT) {
    const chunkIds = uniqueUserIds.slice(i, i + FCM_BATCH_LIMIT);

    try {
      const users = await User.find({
        _id: { $in: chunkIds },
      })
        .select("_id token")
        .lean();

      if (!users.length) continue;

      const messages = [];
      const messageOwners = [];
      const messageTokens = [];

      users.forEach((user) => {
        if (!user.token) {
          results.set(String(user._id), {
            status: "no_token",
          });
          return;
        }

        const token = String(user.token).trim();

        if (!token) {
          results.set(String(user._id), {
            status: "no_token",
          });
          return;
        }

        messages.push({
          token,

          notification: {
            title: String(title || ""),
            body: String(body || ""),
          },

          data: normalizeData(data),

          android: {
            priority: "high",
            notification: {
              sound: "default",
            },
          },

          webpush: {
            headers: {
              Urgency: "high",
            },
          },
        });

        messageOwners.push(String(user._id));
        messageTokens.push(token);
      });

      if (!messages.length) continue;

      const response = await messaging.sendEach(messages);

      const expiredTokens = [];

      response.responses.forEach((result, index) => {
        const userId = messageOwners[index];
        const token = messageTokens[index];

        if (result.success) {
          results.set(userId, {
            status: "sent",
            messageId: result.messageId,
          });

          return;
        }

        const errorCode = result.error?.code || "unknown";

        if (results.get(userId)?.status !== "sent") {
          results.set(userId, {
            status: "failed",
            error: errorCode,
            message: result.error?.message,
          });
        }

        console.error(
          `FCM failed for ${userId}:`,
          errorCode,
          result.error?.message,
        );

        if (errorCode === "messaging/registration-token-not-registered") {
          expiredTokens.push(token);
        }
      });

      if (expiredTokens.length > 0) {
        await User.updateMany(
          {
            token: {
              $in: expiredTokens,
            },
          },
          {
            $unset: {
              token: "",
            },
          },
        );
      }
    } catch (error) {
      console.error("FCM batch error:", error.code, error.message);

      chunkIds.forEach((userId) => {
        const id = String(userId);

        if (results.get(id)?.status !== "sent") {
          results.set(id, {
            status: "failed",
            error: error.code || "BATCH_FATAL",
            message: error.message,
          });
        }
      });
    }
  }

  return results;
}

export async function sendPushToTopic(topic, { title, body, data = {} } = {}) {
  if (!topic) {
    return {
      status: "failed",
      error: "Topic is required",
    };
  }

  try {
    const messageId = await messaging.send({
      topic,

      notification: {
        title: String(title || ""),
        body: String(body || ""),
      },

      data: normalizeData(data),

      android: {
        priority: "high",
        notification: {
          sound: "default",
        },
      },

      webpush: {
        headers: {
          Urgency: "high",
        },
      },
    });

    return {
      status: "sent",
      messageId,
    };
  } catch (error) {
    console.error("FCM topic error:", error.code, error.message);

    return {
      status: "failed",
      error: error.code || "unknown",
      message: error.message,
    };
  }
}
