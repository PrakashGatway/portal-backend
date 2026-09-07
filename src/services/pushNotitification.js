import { messaging } from "../config/firebase.js";
import { fcmToken } from "../models/fcmToken.js";

const FCM_BATCH_LIMIT = 500;

function normalizeData(data = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      String(key),
      value === null || value === undefined ? "" : String(value),
    ])
  );
}

export async function sendPushToUsers(userIds, { title, body, data = {} } = {}) {
  const results = new Map();

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return results;
  }

  const uniqueUserIds = [...new Set(userIds.filter(Boolean).map(String))];

  // Initialize everyone as no_token; overwritten below if a token exists
  uniqueUserIds.forEach((id) => results.set(id, { status: "no_token" }));

  for (let i = 0; i < uniqueUserIds.length; i += FCM_BATCH_LIMIT) {
    const chunkIds = uniqueUserIds.slice(i, i + FCM_BATCH_LIMIT);

    // A user can have multiple tokens (multiple devices)
    const tokenDocs = await fcmToken
      .find({ user: { $in: chunkIds } })
      .select("token user")
      .lean();

    if (!tokenDocs.length) continue;

    const messages = [];
    const messageOwners = []; // parallel array: userId for each message
    const messageTokens = []; // parallel array: raw token string for each message

    tokenDocs.forEach((doc) => {
      messages.push({
        token: doc.token,
        notification: {
          title: String(title || ""),
          body: String(body || ""),
        },
        data: normalizeData(data),
        android: {
          priority: "high",
          notification: { sound: "default" },
        },
        webpush: {
          headers: { Urgency: "high" },
        },
      });

      messageOwners.push(String(doc.user));
      messageTokens.push(doc.token);
    });

    try {
      const response = await messaging.sendEach(messages);
      const expiredTokens = [];

      response.responses.forEach((result, index) => {
        const userId = messageOwners[index];

        if (result.success) {
          // Mark "sent" if at least one of this user's devices succeeded
          results.set(userId, { status: "sent", messageId: result.messageId });
          return;
        }

        const errorCode = result.error?.code || "unknown";

        // Only overwrite with "failed" if we haven't already recorded a "sent"
        if (results.get(userId)?.status !== "sent") {
          results.set(userId, {
            status: "failed",
            error: errorCode,
            message: result.error?.message,
          });
        }

        console.error(`FCM failed for ${userId}:`, errorCode, result.error?.message);

        if (errorCode === "messaging/registration-token-not-registered") {
          expiredTokens.push(messageTokens[index]);
        }
      });

      if (expiredTokens.length > 0) {
        await fcmToken.deleteMany({ token: { $in: expiredTokens } });
      }
    } catch (error) {
      console.error("FCM batch error:", error);

      messageOwners.forEach((userId) => {
        if (results.get(userId)?.status !== "sent") {
          results.set(userId, {
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
    return { status: "failed", error: "Topic is required" };
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
        notification: { sound: "default" },
      },
      webpush: {
        headers: { Urgency: "high" },
      },
    });

    return { status: "sent", messageId };
  } catch (error) {
    console.error("FCM topic error:", error.code, error.message);
    return { status: "failed", error: error.code || "unknown", message: error.message };
  }
}






// import { messaging } from "../config/firebase.js";
// import User from "../models/User.js";

// const FCM_BATCH_LIMIT = 500;

// function normalizeData(data = {}) {
//   return Object.fromEntries(
//     Object.entries(data).map(([key, value]) => [
//       String(key),
//       value === null || value === undefined ? "" : String(value),
//     ])
//   );
// }

// export async function sendPushToUsers(
//   userIds,
//   { title, body, data = {} } = {}
// ) {
//   const results = new Map();

//   if (!Array.isArray(userIds) || userIds.length === 0) {
//     return results;
//   }

//   const uniqueUserIds = [
//     ...new Set(userIds.filter(Boolean).map(String)),
//   ];

//   for (let i = 0; i < uniqueUserIds.length; i += FCM_BATCH_LIMIT) {
//     const chunkIds = uniqueUserIds.slice(
//       i,
//       i + FCM_BATCH_LIMIT
//     );

//     const users = await User.find({
//       _id: { $in: chunkIds },
//     })
//       .select("_id fcmToken")
//       .lean();

//     const tokenByUser = new Map();

//     users.forEach((user) => {
//       if (user.fcmToken) {
//         tokenByUser.set(
//           String(user._id),
//           user.fcmToken.trim()
//         );
//       }
//     });

//     const messages = [];
//     const orderedUserIds = [];

//     for (const userId of chunkIds) {
//       const token = tokenByUser.get(userId);

//       if (!token) {
//         results.set(userId, {
//           status: "no_token",
//         });
//         continue;
//       }

//       orderedUserIds.push(userId);

//       messages.push({
//         token,

//         notification: {
//           title: String(title || ""),
//           body: String(body || ""),
//         },

//         data: normalizeData(data),

//         android: {
//           priority: "high",
//           notification: {
//             sound: "default",
//           },
//         },

//         webpush: {
//           headers: {
//             Urgency: "high",
//           },
//         },
//       });
//     }

//     if (!messages.length) {
//       continue;
//     }

//     try {
//       const response = await messaging.sendEach(messages);

//       const expiredTokens = [];

//       response.responses.forEach((result, index) => {
//         const userId = orderedUserIds[index];

//         if (result.success) {
//           results.set(userId, {
//             status: "sent",
//             messageId: result.messageId,
//           });

//           return;
//         }

//         const errorCode =
//           result.error?.code || "unknown";

//         results.set(userId, {
//           status: "failed",
//           error: errorCode,
//           message: result.error?.message,
//         });

//         console.error(
//           `FCM failed for ${userId}:`,
//           errorCode,
//           result.error?.message
//         );

//         if (
//           errorCode ===
//           "messaging/registration-token-not-registered"
//         ) {
//           expiredTokens.push(
//             messages[index].token
//           );
//         }
//       });

//       if (expiredTokens.length > 0) {
//         await User.updateMany(
//           {
//             fcmToken: {
//               $in: expiredTokens,
//             },
//           },
//           {
//             $unset: {
//               fcmToken: 1,
//             },
//           }
//         );
//       }
//     } catch (error) {
//       console.error(
//         "FCM batch error:",
//         error
//       );

//       orderedUserIds.forEach((userId) => {
//         results.set(userId, {
//           status: "failed",
//           error: error.code || "BATCH_FATAL",
//           message: error.message,
//         });
//       });
//     }
//   }

//   return results;
// }

// export async function sendPushToTopic(
//   topic,
//   { title, body, data = {} } = {}
// ) {
//   if (!topic) {
//     return {
//       status: "failed",
//       error: "Topic is required",
//     };
//   }

//   try {
//     const messageId = await messaging.send({
//       topic,

//       notification: {
//         title: String(title || ""),
//         body: String(body || ""),
//       },

//       data: normalizeData(data),

//       android: {
//         priority: "high",
//         notification: {
//           sound: "default",
//         },
//       },

//       webpush: {
//         headers: {
//           Urgency: "high",
//         },
//       },
//     });

//     return {
//       status: "sent",
//       messageId,
//     };
//   } catch (error) {
//     console.error(
//       "FCM topic error:",
//       error.code,
//       error.message
//     );

//     return {
//       status: "failed",
//       error: error.code || "unknown",
//       message: error.message,
//     };
//   }
// }