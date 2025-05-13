import { setupChatNamespace } from "./chat/index.js";
import { subscribeToChannel } from "../services/redis.js";
import { logger } from "../utils/logger.js";
import { setupPaymentNamespace } from "./payment/index.js";

export function setupNamespaces(io, redisClient) {
  const chatNamespace = setupChatNamespace(io, redisClient);
  const paymentNamespace = setupPaymentNamespace(io, redisClient);

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
  await subscribeToChannel("galaeducation_database_payments", (message) => {
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
        logger.error(`This is the error ${parseErr}`)
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

      if (parsedMessage.event === "payments.event") {
        const { clientEmail: email, message: paymentMessage } =
          parsedMessage.data;

        if (!email || !paymentMessage) {
          logger.warn(
            "Missing email or paymentMessage in Redis data:",
            parsedMessage.data
          );
          return;
        }

        namespaces.payment.to(email).emit("paymentResponse", paymentMessage);
        logger.info(`Payment event sent to ${email}`);
      }
    } catch (error) {
      logger.error("Error processing payment message:", error);
    }
  });

  logger.info("Redis subscriptions setup complete");
}
