import { authenticateNamespace } from "../../middleware/auth.js";
import { logger } from "../../utils/logger.js";
import { chatSocket } from "./socket.js";

export function setupChatNamespace(io, redisClient, redisOps) {
  try {
    const chatNamespace = io.of("/chat");

    // Apply authentication middleware
    authenticateNamespace(chatNamespace);

    // Set up socket handlers
    chatSocket(chatNamespace, redisClient, redisOps);

    // Add error handling for the namespace
    chatNamespace.on("connect_error", (err) => {
      logger.error(`Chat namespace connection error: ${err.message}`, err);
    });

    logger.info("Chat namespace initialized");

    return chatNamespace;
  } catch (error) {
    logger.error("Failed to setup chat namespace:", error);
    throw error;
  }
}
