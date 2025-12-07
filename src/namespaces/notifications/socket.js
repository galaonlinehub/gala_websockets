import { logger } from "../../utils/logger.js";
import { EVENTS } from "../../config/socket/events.js";
import { ROOMS } from "../../config/socket/rooms.js";
import {
  handleNotificationRead,
  handleDisconnect,
} from "./handlers.js";

export function notificationSocket(namespace, redisClient, redisOps) {
  if (!namespace || !redisOps) {
    logger.error("Notifications Namespace or Redis Client is not initialized.");
    return;
  }

  namespace.on(EVENTS.CONNECT, (socket) => {
    const userId = socket.user?.id || socket.handshake.query.user_id;

    if (!userId) {
      logger.error(
        `Notifications Namespace: User ID not found in socket connection ${userId}`
      );
      return socket.disconnect();
    }

    socket.join(ROOMS.user(userId));

    const mainContext = { socket, userId, redisClient, redisOps, namespace };

    socket.on(EVENTS.NOTIFICATION_READ, async (data) =>
      handleNotificationRead({ ...mainContext, data })
    );

    socket.on(EVENTS.DISCONNECT, () => handleDisconnect(mainContext));
  });
}
