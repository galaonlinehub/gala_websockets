import { setupChatNamespace } from "./chat/index.js";
import { subscribeToChannel } from "../services/redis.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
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
      const parsedMessage = JSON.parse(message);
      console.log(parsedMessage)
      if (parsedMessage.event === "payments.event") {
        const { clientEmail: email, message: paymentMessage } =
          parsedMessage.data;
        namespaces.payment.to(email).emit("paymentResponse", paymentMessage);
        logger.info(`Payment event sent to ${email}`);
      }
    } catch (error) {
      logger.error("Error processing payment message:", error);
    }
  });

  // Add other channel subscriptions as needed

  logger.info("Redis subscriptions setup complete");
}
