import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "@redis/client";
import axios from "axios";
import { format } from "date-fns";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000" },

  maxHttpBufferSize: 10e6,
  // Optimize for high concurrency
  pingTimeout: 60000,
  pingInterval: 25000,
});
const redis = createClient({ url: "redis://localhost:6379" });

// For 500K–1M users, consider Redis clustering or sharding in production
(async () => {
  await redis.connect();
})();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  const user_id = socket.handshake.query.user_id;

  socket.on("social", async (idx, chats) => {
    console.log("Processing social for user:", idx);
    console.log("Chats:", chats);

    if (chats && chats.length > 0) {
      socket.join(chats);
      console.log(`Socket ${socket.id} joined ${chats.length} chats`);

      const allUpdates = [];
      const chatMessageIds = {};

      for (const chat_id of chats) {
        const messages = await redis.lRange(`chat:${chat_id}:messages`, 0, -1);
        if (messages.length > 0) {
          const messageIds = messages.map((msg) => JSON.parse(msg).message_id);
          chatMessageIds[chat_id] = messageIds;

          messageIds.forEach((message_id) => {
            allUpdates.push({
              chat_id,
              message_id,
              user_id: idx,
              status: "delivered",
            });
          });

          io.to(chat_id).emit("messages_delivered", {
            user_id: idx,
            message_ids: messageIds,
            status: "delivered",
          });
        }
      }

      // Single DB batch update (commented out for now, enable with backend support)
      if (allUpdates.length > 0) {
        // await updateMessageStatusesBatchAll(allUpdates);
      }
    }
  });

  socket.on("join_chat", async (chat_id) => {
    socket.join(chat_id);
    io.to(chat_id).emit("user_joined", { user_id });

    // Simulate fetching participants from backend or store the joining user
    // In production, this should come from your backend API response
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

  socket.on("send_message", async (data) => {
    const { chat_id, content, type, sender_id } = data;

    const rawSentAt = new Date();
    const formattedSentAt = format(rawSentAt, "HH:mm a").toLowerCase();
    const tempMessageId = Date.now();
    const message = {
      message_id: tempMessageId,
      chat_id,
      sender_id,
      content,
      type: type || "text",
      sent_at: rawSentAt.toISOString(),
    };

    const newLength = await redis.rPush(
      `chat:${chat_id}:messages`,
      JSON.stringify(message)
    );
    const messageIndex = newLength - 1;

    io.to(chat_id).emit("new_message", {
      ...message,
      sent_at: formattedSentAt,
      sent_at_iso: rawSentAt.toISOString(),
    });

    const participants = await redis.lRange(
      `chat:${chat_id}:participants`,
      0,
      -1
    );
    for (const participant_id of participants) {
      if (participant_id !== sender_id) {
        const unreadKey = `unread:${participant_id}:${chat_id}`;
        await redis.incr(unreadKey);
        const unreadCount = await redis.get(unreadKey);

        io.to(chat_id).emit("sidebar_new_message", {
          chat_id,
          message: { ...message, sent_at: formattedSentAt },
          unread_count: parseInt(unreadCount),
        });
      }
    }

    const result = await storeMessage(message);
    if (result?.data?.id) {
      const oldMessageId = message.message_id;
      message.message_id = result.data.id;
      await redis.lSet(
        `chat:${chat_id}:messages`,
        messageIndex,
        JSON.stringify(message)
      );
      io.to(chat_id).emit("message_id_updated", {
        old_id: oldMessageId,
        new_id: message.message_id,
      });
    }
  });

  socket.on("message_read", async ({ chat_id, message_id, user_id }) => {
    io.to(chat_id).emit("message_status", {
      message_id,
      user_id,
      status: "read",
    });

    // Reset unread count when chat is opened
    const unreadKey = `unread:${user_id}:${chat_id}`;
    await redis.set(unreadKey, 0);
    io.to(chat_id).emit("sidebar_unread_reset", { chat_id, unread_count: 0 });
  });

  socket.on("disconnect", async () => {
    const chat_id = await redis.get(`user:${socket.id}:chat`);
    if (chat_id) {
      io.to(chat_id).emit("user_left", { user_id });
    }
    await redis.del(`user:${socket.id}:chat`);
    console.log("User disconnected:", socket.id);
  });
});

// Helper functions remain unchanged unless backend supports batch updates
const storeMessage = async (message) => {
  const url = "http://localhost:8000/api/chat/messages";
  try {
    const response = await axios.post(url, message);
    return response;
  } catch (error) {
    console.error("Failed to store message:", error);
  }
};

const updateMessageStatusesBatchAll = async (updates) => {
  const url = "http://localhost:8000/api/message/status/batch-all";
  try {
    const response = await axios.post(url, { updates });
    console.log(`Batch updated ${updates.length} message statuses`);
    return response;
  } catch (error) {
    console.error("Failed to batch update message statuses:", error);
  }
};

server.listen(4000, () => console.log("Real-time server on port 4000"));
