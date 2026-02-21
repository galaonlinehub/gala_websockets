import { setupChatNamespace } from "./chat/index.js";
import { subscribeToChannel } from "../services/redis.js";
import { logger } from "../utils/logger.js";
import { setupPaymentNamespace } from "./payment/index.js";
import { setupNotificationsNamespace } from "./notifications/index.js";
import { config } from "../config/index.js";
import { donationEvent, payments, lessonReminder } from "../utils/redis-subscribed-events.js";

export function setupNamespaces(io, redisClient, redisOps) {
  try {
    logger.info("Setting up namespaces...");

    const chatNamespace = setupChatNamespace(io, redisClient, redisOps);
    logger.info("Chat namespace setup complete");

    const paymentNamespace = setupPaymentNamespace(io, redisClient, redisOps);
    logger.info("Payment namespace setup complete");

    const notificationsNamespace = setupNotificationsNamespace(io, redisClient, redisOps);
    logger.info("Notifications namespace setup complete");

    // Verify namespaces are registered
    const registeredNamespaces = Array.from(io._nsps.keys());
    logger.info(`Registered namespaces: ${registeredNamespaces.join(", ")}`);

    setupRedisSubscriptions({ payment: paymentNamespace, notifications: notificationsNamespace });

    logger.info("All namespaces initialized successfully");

    return {
      chat: chatNamespace,
      payment: paymentNamespace,
      notifications: notificationsNamespace,
    };
  } catch (error) {
    logger.error("Failed to setup namespaces:", error);
    throw error;
  }
}

async function setupRedisSubscriptions(namespaces) {
  await subscribeToChannel(config.redis.channels, (message) => {

    try {
      if (!message) {
        logger.warn("Received empty Redis message");
        return;
      }


      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message);
      } catch (parseErr) {
        logger.warn("Failed to parse Redis message as JSON:", message);
        logger.error(`This is the error ${parseErr}`);
        return;
      }

      if (
        !parsedMessage ||
        typeof parsedMessage !== "object" ||
        !parsedMessage.event ||
        !parsedMessage.data
      ) {
        logger.warn("Invalid Redis message format:", parsedMessage);
        return;
      }

      const { payment: paymentNamespace, notifications: notificationsNamespace } = namespaces;
      const data = parsedMessage.data;

      if (parsedMessage.event === "payments.event") {
        payments(paymentNamespace, data);
      } else if (parsedMessage.event === "donations.event") {
        donationEvent(paymentNamespace, data);
      } else if (parsedMessage.event === "lessonStartingSoon") {
        lessonReminder(notificationsNamespace, data);
      }
    } catch (error) {
      logger.error("Error processing subscription message:", error);
    }
  });

  logger.info("Redis subscriptions setup complete");
}
