import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "@redis/client";
import { format } from "date-fns";
import { post, put } from "../../services/api.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000" },

  maxHttpBufferSize: 10e6,
  pingTimeout: 60000,
  pingInterval: 25000,
});
const redis = createClient({ url: "redis://localhost:6379" });

(async () => {
  await redis.connect();
})();

io.on("connection", (socket) => {
  const user_id = socket.handshake.query.user_id;

  socket.join(`user:${user_id}`);

  socket.on("social", async (user_id, chats) => {
    if (!chats || chats.length === 0) return;

    socket.join(chats);

    const MAX_MESSAGES = 50;

    for (const chat_id of chats) {
      socket.to(chat_id).emit("user_online", user_id);

      const recentMessages = await redis.lRange(
        `chat:${chat_id}:messages`,
        -MAX_MESSAGES,
        -1
      );
      const deliveredKey = `delivered:${chat_id}:${user_id}`;

      const toMarkDelivered = [];

      for (const raw of recentMessages) {
        const msg = JSON.parse(raw);
        if (msg.sender_id === user_id) continue;
        const alreadyDelivered = await redis.sIsMember(
          deliveredKey,
          String(msg.message_id)
        );
        if (!alreadyDelivered) toMarkDelivered.push(msg.message_id);
      }

      if (toMarkDelivered.length > 0) {
        await redis.sAdd(deliveredKey, toMarkDelivered.map(String));

        io.to(chat_id).emit("message_status_batch", {
          message_ids: toMarkDelivered,
          user_id,
          status: "delivered",
        });

        await updateMessageStatus(
          toMarkDelivered.map((id) => ({ message_id: id })),
          user_id,
          "delivered"
        );
      }
    }

    const user_status_data = {
      user_id,
      status: "online",
      device_info: socket.handshake.headers["user-agent"] || null,
    };

    await updateUserStatus(user_status_data);
  });

  socket.on("send_message", async (data) => {
    const { chat_id, content, type, sender_id } = data;

    const rawSentAt = new Date();
    const formattedSentAt = format(rawSentAt, "HH:mm a").toLowerCase();
    const tempMessageId = Date.now();

    const participants = await redis.lRange(
      `chat:${chat_id}:participants`,
      0,
      -1
    );

    const message = {
      message_id: tempMessageId,
      chat_id,
      sender_id,
      content,
      type: type || "text",
      sent_at: rawSentAt.toISOString(),
    };

    const messageKey = `chat:${chat_id}:messages`;
    const messageIndex =
      (await redis.rPush(messageKey, JSON.stringify(message))) - 1;

    io.to(chat_id).emit("new_message", {
      ...message,
      sent_at: formattedSentAt,
      sent_at_iso: rawSentAt.toISOString(),
    });

    const sockets = await io.in(chat_id).fetchSockets();
    const onlineUserIds = sockets.map((s) => s.handshake.query.user_id);
    const deliveredUserIds = participants.filter(
      (id) => id !== String(sender_id) && onlineUserIds.includes(id)
    );

    for (const id of deliveredUserIds) {
      await redis.sAdd(`delivered:${chat_id}:${id}`, String(tempMessageId));
    }

    if (deliveredUserIds.length > 0) {
      for (const id of deliveredUserIds) {
        io.to(chat_id).emit("message_status_batch", {
          user_id: id,
          message_ids: [tempMessageId],
          status: "delivered",
        });
      }
    }

    const unreadCountsPayload = [];

    for (const participant_id of participants) {
      if (participant_id !== String(sender_id)) {
        const unreadKey = `unread:${participant_id}:${chat_id}`;
        await redis.incr(unreadKey);
        const unreadCount = await redis.get(unreadKey);

        unreadCountsPayload.push({
          user_id: participant_id,
          unread_count: parseInt(unreadCount),
        });

        io.to(`user:${participant_id}`).emit("sidebar_new_message", {
          chat_id,
          message: { ...message, sent_at: formattedSentAt },
          unread_count: parseInt(unreadCount),
        });
      }
    }

    const payload = { ...message, deliveredUserIds };
    const result = await post("/chat/messages", payload);

    if (result?.data?.id) {
      const oldMessageId = String(tempMessageId);
      const newMessageId = String(result.data.id);
      message.message_id = result.data.id;

      io.to(chat_id).emit("message_id_updated", {
        old_id: oldMessageId,
        new_id: newMessageId,
      });

      await redis.lSet(messageKey, messageIndex, JSON.stringify(message));

      for (const id of deliveredUserIds) {
        const key = `delivered:${chat_id}:${id}`;
        if (await redis.sRem(key, oldMessageId)) {
          await redis.sAdd(key, newMessageId);
        }
      }
    }

    await unreadCount(unreadCountsPayload, chat_id);
  });

  socket.on("message_read", async ({ messages, user_id, chat_id }) => {
    const readKey = `read:${chat_id}:${user_id}`;
    const ids = messages.map((m) => m.message_id);
    await redis.sAdd(readKey, ids.map(String));

    io.to(chat_id).emit("message_status_batch", {
      message_ids: messages.map((m) => m.message_id),
      user_id,
      status: "read",
    });

    const unreadKey = `unread:${user_id}:${chat_id}`;
    await redis.set(unreadKey, 0);
    io.to(chat_id).emit("sidebar_unread_reset", { chat_id, unread_count: 0 });

    await updateMessageStatus(messages, user_id, "read");
    await unreadCount([{ user_id, unread_count: 0 }], chat_id);
  });

  socket.on("join_chat", async (chat_id) => {
    socket.join(chat_id);
    io.to(chat_id).emit("user_joined", { user_id });

    const participants = await redis.lRange(
      `chat:${chat_id}:participants`,
      0,
      -1
    );

    if (!participants.includes(user_id)) {
      await redis.rPush(`chat:${chat_id}:participants`, user_id);
      console.log(`Added ${user_id} to participants of chat ${chat_id}`);
    }
    console.log(
      `Participants in chat ${chat_id}:`,
      await redis.lRange(`chat:${chat_id}:participants`, 0, -1)
    );
  });

  socket.on("typing", ({ chat_id, user_id }) => {
    socket.to(chat_id).emit("user_typing", { user_id });
    socket.to(chat_id).emit("sidebar_typing", { chat_id, user_id });
  });

  socket.on("stop_typing", ({ chat_id, user_id }) => {
    socket.to(chat_id).emit("user_stop_typing", { user_id });
    socket.to(chat_id).emit("sidebar_stop_typing", { chat_id, user_id });
  });

  socket.on("disconnect", async () => {
    const chat_id = await redis.get(`user:${socket.id}:chat`);
    if (chat_id) {
      socket.to(chat_id).emit("user_left", {
        user_id,
        last_active_at: new Date().toISOString(),
      });
    }

    const user_status_data = {
      user_id,
      status: "offline",
      device_info: socket.handshake.headers["user-agent"] || null,
    };

    await updateUserStatus(user_status_data);

    await redis.del(`user:${socket.id}:chat`);
    console.log("User disconnected:", socket.id);
  });
});

//HELPERS

const prepareMessageStatusUpdatePayload = (messages, user_id, status) => ({
  message_ids: messages.map((m) => m.message_id),
  user_id: user_id,
  status: status,
});

export const updateMessageStatus = async (messages, user_id, status) => {
  try {
    const payload = prepareMessageStatusUpdatePayload(
      messages,
      user_id,
      status
    );
    const data = await post("/message/status", payload);
    return data;
  } catch (error) {
    console.error(
      `Failed to update message status to "${status}":`,
      error.response?.data || error.message
    );
    return null;
  }
};

export const unreadCount = async (data, chat_id) =>
  await put(`chat/${chat_id}/unread-counts`, { participants: data });

export const updateUserStatus = async (data) =>
  await post("/user-status", data);

server.listen(4000, () => console.log("Real-time server on port 4000"));
