import { EVENTS } from "../config/socket/events.js";
import pinnoLogger from "./pinno-logger.js";
import { emitSocketError } from "./socket-error.js";

export const donationEvent = (n, m) => {
  try {
    const { room_name, message } = m;

    if (!room_name || !message) {
      pinnoLogger.error("No room name or message", m);
      return;
    }

    n.to(room_name).emit(EVENTS.DONATION, message);
  } catch (e) {
    emitSocketError(n, e);

    throw e;
  }
};

export const payments = (n, m) => {
  try {
    const { clientEmail, message } = m;

    if (!clientEmail || !message) {
      pinnoLogger.warn("Missing email or paymentMessage in Redis data:", m);
      return;
    }

    n.to(clientEmail).emit(EVENTS.PAYMENT_RESPONSE, message);
    pinnoLogger.info(`Payment event sent to ${clientEmail}`);
  } catch (e) {
    emitSocketError(n, e);

    throw e;
  }
};
