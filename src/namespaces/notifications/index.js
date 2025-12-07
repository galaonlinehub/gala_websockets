import { authenticateNamespace } from "../../middleware/auth.js";
import { logger } from "../../utils/logger.js";
import { notificationSocket } from "./socket.js";

export function setupNotificationsNamespace(io, redisClient, redisOps) {
  try {
    const notificationsNamespace = io.of("/notifications");

    // Apply authentication middleware
    authenticateNamespace(notificationsNamespace);

    // Set up socket handlers
    notificationSocket(notificationsNamespace, redisClient, redisOps);

    // Add error handling for the namespace
    notificationsNamespace.on("connect_error", (err) => {
      logger.error(`Notifications namespace connection error: ${err.message}`, err);
    });

    logger.info("Notifications namespace initialized");

    return notificationsNamespace;
  } catch (error) {
    logger.error("Failed to setup notifications namespace:", error);
    throw error;
  }
}
