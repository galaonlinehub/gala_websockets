import { format } from "date-fns";
import {
  markMessageDelivered,
  storeMessage,
  incrementUnreadCount,
  resetUnreadCount,
  markMessageRead,
  updateMessageId,
} from "./redis.js";
import { makeAuthenticatedRequest } from "../../services/api.js";
import { logger } from "../../utils/logger.js";
import {
  updateMessageStatus,
  updateUserStatus,
  updateUnreadCounts,
} from "./helpers.js";
import { config } from "../../config/index.js";
import { emitSocketError } from "../../utils/socket-error.js";
import { EVENTS } from "../../config/socket/events.js";
import {
  MAX_MESSAGES,
  MESSAGE_STATUSES,
  USER_STATUSES,
} from "../../config/env/variables.js";
import { authContext } from "../../utils/auth.js";
import { ROOMS } from "../../config/socket/rooms.js";
import { deleteRedisKey } from "../../config/redis/redis.js";
import { getParticipantsWithFallback } from "./repository.js";
import pinnoLogger from "../../utils/pinno-logger.js";

export async function handleJoinChat({ socket, userId, chatId, redisOps }) {
  try {
    if (!chatId) {
      logger.info("No chat Id has been provided");
      return;
    }

    socket.join(chatId);
    socket.to(chatId).emit(EVENTS.USER_JOINED, { userId });

    const context = authContext(socket);
    const participantObj = { chatId, redisOps, context };

    const participants = await getParticipantsWithFallback(participantObj);
    if (!participants) return;

    const key = config.redis.keys.userChats(userId);
    const ttl = config.redis.ttl.userChats;

    await redisOps.addToSetWithTTL(key, ttl, chatId);
  } catch (error) {
    logger.error("Error handling join chat:", error);
    emitSocketError(socket, error);
  }
}

export async function handleSocialConnect({ socket, userId, chats, redisOps }) {
  pinnoLogger({ chat: chats, msg: "THESE ARE CHATS" });
  try {
    if (!chats || chats.length === 0) return;
    const context = authContext(socket);
    socket.join(chats);

    socket.to(chats).emit(EVENTS.USER_ONLINE, userId);

    for (const chatId of chats) {
      const chatMessageKey = config.redis.keys.chatMessages(chatId);
      const recentMessages = await redisOps.getListRange(
        chatMessageKey,
        -MAX_MESSAGES,
        -1
      );
      const deliveredKey = config.redis.keys.delivered(chatId, userId);

      const toMarkDelivered = [];

      for (const msg of recentMessages) {
        if (msg.sender_id === userId) continue;

        const alreadyDelivered = await redisOps.isSetMember(
          deliveredKey,
          String(msg.message_id)
        );
        if (alreadyDelivered) continue;

        toMarkDelivered.push(msg.message_id);
      }

      if (toMarkDelivered.length > 0) {
        await redisOps.addToSet(deliveredKey, toMarkDelivered.map(String));

        socket.to(chatId).emit(EVENTS.CHAT_MESSAGE_STATUS_BATCH, {
          message_ids: toMarkDelivered,
          user_id: userId,
          status: MESSAGE_STATUSES.DELIVERED,
        });

        await updateMessageStatus(
          toMarkDelivered.map((id) => ({ message_id: id })),
          userId,
          MESSAGE_STATUSES.DELIVERED,
          context
        );
      }
    }

    const userStatusData = {
      user_id: userId,
      status: USER_STATUSES.ONLINE,
      device_info: socket.handshake.headers["user-agent"] || null,
    };

    await updateUserStatus(userStatusData, context);
  } catch (e) {
    emitSocketError(socket, e);
  }
}

export async function handleSendMessage({ socket, data, namespace, redisOps }) {
  try {
    const { chat_id, content, type, sender_id } = data;
    const context = authContext(socket);
    const rawSentAt = new Date();
    const formattedSentAt = format(rawSentAt, "HH:mm a").toLowerCase();
    const tempMessageId = Date.now();
    const participantObj = { chatId: chat_id, redisOps, context };

    const participants = await getParticipantsWithFallback(participantObj);
    if (!participants) return;

    const message = {
      message_id: tempMessageId,
      chat_id,
      sender_id,
      content,
      type: type || "text",
      sent_at: rawSentAt.toISOString(),
    };

    const messageIndex = await storeMessage(chat_id, message, redisOps);

    namespace.to(chat_id).emit(EVENTS.CHAT_NEW_MESSAGE, {
      ...message,
      sent_at: formattedSentAt,
      sent_at_iso: rawSentAt.toISOString(),
    });

    const sockets = await namespace.in(chat_id).fetchSockets();
    const onlineUserIds = sockets.map((s) => s.handshake.query.user_id);
    const deliveredUserIds = participants.filter(
      (id) => id !== String(sender_id) && onlineUserIds.includes(id)
    );

    for (const id of deliveredUserIds) {
      await markMessageDelivered(chat_id, id, tempMessageId, redisOps);
    }

    if (deliveredUserIds.length > 0) {
      namespace.to(chat_id).emit(EVENTS.CHAT_MESSAGE_STATUS_BATCH, {
        message_ids: [tempMessageId],
        user_id: deliveredUserIds,
        status: MESSAGE_STATUSES.DELIVERED,
      });
    }

    const unreadCountsPayload = [];

    for (const participantId of participants) {
      if (participantId !== sender_id) {
        const unreadCount = await incrementUnreadCount(
          participantId,
          chat_id,
          redisOps
        );

        unreadCountsPayload.push({
          user_id: participantId,
          unread_count: unreadCount,
        });

        namespace
          .to(ROOMS.user(participantId))
          .emit(EVENTS.CHAT_SIDEBAR_NEW_MESSAGE, {
            chat_id,
            message: { ...message, sent_at: formattedSentAt },
            unread_count: unreadCount,
          });
      }
    }

    const payload = { ...message, deliveredUserIds };
    const client = makeAuthenticatedRequest(context.token, context.isDev);
    const result = await client.post("/chat/messages", payload);

    if (result?.data?.id) {
      const oldMessageId = String(tempMessageId);
      const newMessageId = String(result.data.id);
      message.message_id = result.data.id;

      namespace.to(chat_id).emit(EVENTS.CHAT_MESSAGE_ID_UPDATE, {
        old_id: oldMessageId,
        new_id: newMessageId,
      });

      await updateMessageId(chat_id, messageIndex, message, redisOps);

      for (const id of deliveredUserIds) {
        const key = config.redis.keys.delivered(chat_id, id);
        if (await redisOps.removeFromSet(key, oldMessageId)) {
          await redisOps.addToSet(key, newMessageId);
        }
      }
    }

    await updateUnreadCounts(unreadCountsPayload, chat_id, context);
  } catch (e) {
    emitSocketError(socket, e);
  }
}

export async function handleMessageRead({ socket, data, namespace, redisOps }) {
  const { messages, user_id, chat_id } = data;
  const context = authContext(socket);

  await markMessageRead(
    chat_id,
    user_id,
    messages.map((m) => m.message_id),
    redisOps
  );

  namespace.to(chat_id).emit(EVENTS.CHAT_MESSAGE_STATUS_BATCH, {
    message_ids: messages.map((m) => m.message_id),
    user_id,
    status: MESSAGE_STATUSES.READ,
  });

  await resetUnreadCount(user_id, chat_id, redisOps);

  namespace.to(chat_id).emit(EVENTS.CHAT_SIDEBAR_UNREAD_RESET, {
    chat_id,
    unread_count: 0,
  });

  await updateMessageStatus(messages, user_id, MESSAGE_STATUSES.READ, context);
  await updateUnreadCounts([{ user_id, unread_count: 0 }], chat_id, context);
}

export function handleTyping({ socket, data }) {
  const { chat_id, user_id } = data;

  socket.to(chat_id).emit(EVENTS.USER_TYPING, { user_id });

  socket.to(chat_id).emit(EVENTS.CHAT_SIDEBAR_TYPING, { chat_id, user_id });
}

export function handleStopTyping({ socket, data }) {
  const { chat_id, user_id } = data;

  socket.to(chat_id).emit(EVENTS.USER_STOP_TYPING, { user_id });

  socket
    .to(chat_id)
    .emit(EVENTS.CHAT_SIDEBAR_STOP_TYPING, { chat_id, user_id });
}

export async function handleDisconnect({
  socket,
  userId,
  redisClient,
  redisOps,
}) {
  const userKey = config.redis.keys.userChats(userId);

  const chatId = await redisOps.getSetMembers(userKey);

  const context = authContext(socket);

  console.log("USER IS LEAVING...");

  if (chatId) {
    socket.to(chatId).emit(EVENTS.USER_OFFLINE, {
      user_id: userId,
      last_active_at: new Date().toISOString(),
    });
  }

  const userStatusData = {
    user_id: userId,
    status: USER_STATUSES.OFFLINE,
    device_info: socket.handshake.headers["user-agent"] || null,
  };

  await updateUserStatus(userStatusData, context);

  await deleteRedisKey(redisClient, userKey);
}
