// import { authenticateNamespace } from "../../middleware/auth.js";
import { logger } from "../../utils/logger.js";
import { paymentSocket } from "./socket.js";

export function setupPaymentNamespace(io, redisClient, redisOps) {
  // const paymentNamespace = authenticateNamespace(io.of("/payment"));
  const paymentNamespace = io.of("/payment");
  paymentSocket(paymentNamespace, redisClient, redisOps);

  logger.info("Payment namespace initialized");

  return paymentNamespace;
}
