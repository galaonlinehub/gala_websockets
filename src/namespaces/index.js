import { setupChatNamespace } from "./chat/index.js";
import { subscribeToChannel } from "../services/redis.js";
import { logger } from "../utils/logger.js";
import { setupPaymentNamespace } from "./payment/index.js";
import { config } from "../config/index.js";
import { donationEvent, payments } from "../utils/redis-subscribed-events.js";
import pinnoLogger from "../utils/pinno-logger.js";

export function setupNamespaces(io, redisClient, redisOps) {
  const chatNamespace = setupChatNamespace(io, redisClient, redisOps);
  const paymentNamespace = setupPaymentNamespace(io, redisClient, redisOps);

  setupRedisSubscriptions(redisClient, {
    payment: paymentNamespace,
    chat: chatNamespace,
  });

  logger.info("All namespaces initialized");

  return {
    chat: chatNamespace,
    payment: paymentNamespace,
  };
}

async function setupRedisSubscriptions(redisClient, namespaces) {
  pinnoLogger.info("THIS IS US")
  await subscribeToChannel(config.redis.channels, (message) => {

    pinnoLogger.info(message);
    pinnoLogger.info("EXECUTED")
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

      const paymentNamespace = namespaces.payment;
      const data = parsedMessage.data;

      if (parsedMessage.event === "payments.event") {
        payments(paymentNamespace, data);
      } else if (parsedMessage.event === "donations.event") {
        donationEvent(paymentNamespace, data);
      }
    } catch (error) {
      logger.error("Error processing payment message:", error);
    }
  });

  logger.info("Redis subscriptions setup complete");
}
