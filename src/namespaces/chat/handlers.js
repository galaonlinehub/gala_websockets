import { format } from "date-fns";
import {
  getChatMessages,
  markMessageDelivered,
  storeMessage,
  getParticipants,
  addParticipant,
  incrementUnreadCount,
  resetUnreadCount,
  markMessageRead,
} from "./redis.js";
import { makeAuthenticatedRequest } from "../../services/api.js";
import { logger } from "../../utils/logger.js";
import {
  updateMessageStatus,
  updateUserStatus,
  updateUnreadCounts,
} from "./helpers.js";

export async function handleJoinChat(socket, chatId, redisClient) {
  logger.info(`JOIN CHAT IS EMITTED RIGHT ${chatId} , ${socket}`)

  const userId = socket.user.id || socket.handshake.query.user_id;

  if (!chatId) {
    logger.info("No chat Id has been provided");
    return;
  }

  socket.join(chatId);

  socket.to(chatId).emit("user_joined", { userId });

  const participants = await getParticipants(chatId, redisClient);

  logger.info(`THESE ARE PARTICIPANTS ${participants}`);

  if (!participants.includes(String(userId))) {
    logger.info(`we are addding ${userId} ${socket.user.id}`)
    await addParticipant(chatId, userId, redisClient);
    logger.info(`Added ${userId} to participants of chat ${chatId}`);
  }

  logger.debug(`User ${userId} joined chat ${chatId}`);

  await redisClient.set(`user:${socket.id}:chat`, chatId);
}

export async function handleSocialConnect(socket, userId, chats, redisClient) {
  if (!chats || chats.length === 0) return;
  const context = {
    token: socket.token,
    isDev: socket.isDev,
  };

  socket.join(chats);

  const MAX_MESSAGES = 50;

  for (const chatId of chats) {
    socket.to(chatId).emit("user_online", userId);

    const recentMessages = await getChatMessages(
      chatId,
      MAX_MESSAGES,
      redisClient
    );
    const deliveredKey = `delivered:${chatId}:${userId}`;

    const toMarkDelivered = [];

    for (const msg of recentMessages) {
      if (msg.sender_id === userId) continue;

      const alreadyDelivered = await redisClient.sIsMember(
        deliveredKey,
        String(msg.message_id)
      );
      if (!alreadyDelivered) {
        toMarkDelivered.push(msg.message_id);
      }
    }

    if (toMarkDelivered.length > 0) {
      await redisClient.sAdd(deliveredKey, toMarkDelivered.map(String));

      socket.to(chatId).emit("message_status_batch", {
        message_ids: toMarkDelivered,
        user_id: userId,
        status: "delivered",
      });

      await updateMessageStatus(
        toMarkDelivered.map((id) => ({ message_id: id })),
        userId,
        "delivered",
        context
      );
    }
  }

  const userStatusData = {
    user_id: userId,
    status: "online",
    device_info: socket.handshake.headers["user-agent"] || null,
  };

  await updateUserStatus(userStatusData, context);
}

export async function handleSendMessage(socket, data, namespace, redisClient) {
  const { chat_id, content, type, sender_id } = data;
  const context = {
    token: socket.token,
    isDev: socket.isDev,
  };

  const rawSentAt = new Date();
  const formattedSentAt = format(rawSentAt, "HH:mm a").toLowerCase();
  const tempMessageId = Date.now();

  const participants = await getParticipants(chat_id, redisClient);

  if (!participants) {
    logger.info("THIS CHAT HAS NO PARTICIPANTS SET IN REDIS");
    return;
  }

  logger.info(`particaipants ${participants} ${new Date().toISOString()}`);

  const message = {
    message_id: tempMessageId,
    chat_id,
    sender_id,
    content,
    type: type || "text",
    sent_at: rawSentAt.toISOString(),
  };

  const messageIndex = await storeMessage(chat_id, message, redisClient);

  namespace.to(chat_id).emit("new_message", {
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
    await markMessageDelivered(chat_id, id, tempMessageId, redisClient);
  }

  if (deliveredUserIds.length > 0) {
    namespace.to(chat_id).emit("message_status_batch", {
      message_ids: [tempMessageId],
      user_id: deliveredUserIds,
      status: "delivered",
    });
  }

  const unreadCountsPayload = [];

  for (const participantId of participants) {
    if (participantId !== String(sender_id)) {
      const unreadCount = await incrementUnreadCount(
        participantId,
        chat_id,
        redisClient
      );

      unreadCountsPayload.push({
        user_id: participantId,
        unread_count: unreadCount,
      });

      namespace.to(`user:${participantId}`).emit("sidebar_new_message", {
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

    namespace.to(chat_id).emit("message_id_updated", {
      old_id: oldMessageId,
      new_id: newMessageId,
    });

    await redisClient.lSet(
      `chat:${chat_id}:messages`,
      messageIndex,
      JSON.stringify(message)
    );

    for (const id of deliveredUserIds) {
      const key = `delivered:${chat_id}:${id}`;
      if (await redisClient.sRem(key, oldMessageId)) {
        await redisClient.sAdd(key, newMessageId);
      }
    }
  }

  await updateUnreadCounts(unreadCountsPayload, chat_id, context);
}

export async function handleMessageRead(socket, data, namespace, redisClient) {
  const { messages, user_id, chat_id } = data;

  await markMessageRead(
    chat_id,
    user_id,
    messages.map((m) => m.message_id),
    redisClient
  );

  namespace.to(chat_id).emit("message_status_batch", {
    message_ids: messages.map((m) => m.message_id),
    user_id,
    status: "read",
  });

  await resetUnreadCount(user_id, chat_id, redisClient);

  namespace.to(chat_id).emit("sidebar_unread_reset", {
    chat_id,
    unread_count: 0,
  });

  await updateMessageStatus(messages, user_id, "read", socket.token);
  await updateUnreadCounts(
    [{ user_id, unread_count: 0 }],
    chat_id,
    socket.token
  );
}

export function handleTyping(socket, data, _namespace) {
  const { chat_id, user_id } = data;

  socket.to(chat_id).emit("user_typing", { user_id });

  socket.to(chat_id).emit("sidebar_typing", { chat_id, user_id });
}

export function handleStopTyping(socket, data, _namespace) {
  const { chat_id, user_id } = data;

  socket.to(chat_id).emit("user_stop_typing", { user_id });

  socket.to(chat_id).emit("sidebar_stop_typing", { chat_id, user_id });
}

export async function handleDisconnect(socket, userId, namespace, redisClient) {
  const chatId = await redisClient.get(`user:${socket.id}:chat`);
  console.log("USER IS LEAVING...");
  if (chatId) {
    socket.to(chatId).emit("user_offline", {
      user_id: userId,
      last_active_at: new Date().toISOString(),
    });
  }

  const userStatusData = {
    user_id: userId,
    status: "offline",
    device_info: socket.handshake.headers["user-agent"] || null,
  };

  await updateUserStatus(userStatusData, socket.token);

  await redisClient.del(`user:${socket.id}:chat`);
}
