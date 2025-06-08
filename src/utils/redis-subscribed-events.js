import { EVENTS } from "../config/socket/events.js";
import pinnoLogger from "./pinno-logger.js";
import { emitSocketError } from "./socket-error.js";

export const donationEvent = (n, m) => {
  try {
    const { room_name, paymentMessage } = m;

    if (!room_name || !paymentMessage) {
      pinnoLogger.error("No room name or message", m);
      return;
    }

    n.to(room_name).emit(EVENTS.DONATION, paymentMessage);
  } catch (e) {
    emitSocketError(n, e);

    throw e;
  }
};

export const payments = (n, m) => {
  try {
    const { email, paymentMessage } = m;

    if (!email || !paymentMessage) {
      pinnoLogger.warn("Missing email or paymentMessage in Redis data:", m);
      return;
    }

    n.to(email).emit(EVENTS.PAYMENT_RESPONSE, paymentMessage);
    pinnoLogger.info(`Payment event sent to ${email}`);
  } catch (e) {
    emitSocketError(n, e);

    throw e;
  }
};
