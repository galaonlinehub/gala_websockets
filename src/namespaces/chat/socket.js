import { logger } from "../../utils/logger.js";
import {
  handleJoinChat,
  handleSocialConnect,
  handleSendMessage,
  handleMessageRead,
  handleTyping,
  handleDisconnect,
  handleStopTyping,
} from "./handlers.js";
import { initializeRedisOperations } from "./redis.js";

export function chatSocket(namespace, redisClient) {
  const redisOps = initializeRedisOperations(redisClient);

  if(!namespace || !redisOps) {
    logger.error("Chat Namespace or Redis Client is not initialized.");
    return;
  }

  namespace.on("connection", (socket) => {
    const userId = socket.user?.id || socket.handshake.query.user_id;

    if (!userId) {
      logger.error(
        `Chat Namespace: User ID not found in socket connection ${userId}`
      );
      return socket.disconnect();
    }

    socket.join(`user:${userId}`);

    socket.on("join_chat", async (initialChat) =>
      handleJoinChat(socket, initialChat, redisClient)
    );

    socket.on("social", async (userId, chats) =>
      handleSocialConnect(socket, userId, chats, redisClient)
    );

    socket.on("send_message", async (data) =>
      handleSendMessage(socket, data, namespace, redisClient)
    );
    socket.on("message_read", async (data) =>
      handleMessageRead(socket, data, namespace, redisClient)
    );

    socket.on("typing", (data) => handleTyping(socket, data, namespace));
    socket.on("stop_typing", (data) =>
      handleStopTyping(socket, data, namespace)
    );

    socket.on("disconnect", () =>
      handleDisconnect(socket, userId, namespace, redisClient)
    );
  });
}
