import { logger } from "../../utils/logger.js";
import { EVENTS } from "../../config/socket/events.js";
import { ROOMS } from "../../config/socket/rooms.js";
import {
  handleJoinChat,
  handleSocialConnect,
  handleSendMessage,
  handleMessageRead,
  handleTyping,
  handleDisconnect,
  handleStopTyping,
} from "./handlers.js";
import pinnoLogger from "../../utils/pinno-logger.js";

export function chatSocket(namespace, redisClient, redisOps) {
  if (!namespace || !redisOps) {
    logger.error("Chat Namespace or Redis Client is not initialized.");
    return;
  }

  namespace.on(EVENTS.CONNECT, (socket) => {
    const userId = socket.user?.id || socket.handshake.query.user_id;

    if (!userId) {
      logger.error(
        `Chat Namespace: User ID not found in socket connection ${userId}`
      );
      return socket.disconnect();
    }

    socket.join(ROOMS.user(userId));

    const mainContext = { socket, userId, redisClient, redisOps, namespace };

    socket.on(EVENTS.CHAT_JOIN, async (initialChat) =>
      handleJoinChat({ ...mainContext, initialChat })
    );

    socket.on(EVENTS.SOCIAL, async (chats) =>
      handleSocialConnect({ ...mainContext, chats })
    );

    socket.on(EVENTS.CHAT_MESSAGE_SEND, async (data) =>
      handleSendMessage({ ...mainContext, data })
    );
    socket.on(EVENTS.CHAT_MESSAGE_READ, async (data) =>
      handleMessageRead({ ...mainContext, data })
    );

    socket.on(EVENTS.CHAT_TYPING, (data) =>
      handleTyping({ ...mainContext, data })
    );
    socket.on(EVENTS.CHAT_STOP_TYPING, (data) =>
      handleStopTyping({ ...mainContext, data })
    );

    socket.on(EVENTS.DISCONNECT, () => handleDisconnect(mainContext));
  });
}
