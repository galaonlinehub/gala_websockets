import { authenticateNamespace } from "../../middleware/auth.js";
import { logger } from "../../utils/logger.js";
import { notificationSocket } from "./socket.js";

export function setupNotificationsNamespace(io, redisClient, redisOps) {
  const notificationsNamespace = authenticateNamespace(io.of("/notifications"));

  notificationSocket(notificationsNamespace, redisClient, redisOps);

  logger.info("Notifications namespace initialized");

  return notificationsNamespace;
}
