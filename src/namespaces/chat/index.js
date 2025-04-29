import { authenticateNamespace } from "../../middleware/auth.js";
import { logger } from "../../utils/logger.js";
import { chatSocket } from "./socket.js";

export function setupChatNamespace(io, redisClient) {
  logger.info(`THIS IS GOOD ${io}`);
  const chatNamespace = authenticateNamespace(io.of("/chat"));

  chatSocket(chatNamespace, redisClient);

  logger.info("Chat namespace initialized");

  return chatNamespace;
}
