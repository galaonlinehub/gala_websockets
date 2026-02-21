import { EVENTS } from "../config/socket/events.js";
import pinnoLogger from "./pinno-logger.js";
import { emitSocketError } from "./socket-error.js";

export const donationEvent = (n, m) => {
  try {
    const { order_id: room_name, message } = m;

    console.log(m, room_name, message);

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

export const lessonReminder = (n, m) => {
  try {
    const { user_ids, message } = m;

    if (!user_ids || !Array.isArray(user_ids) || !message) {
      pinnoLogger.warn("Missing user_ids or message in Redis data:", m);
      return;
    }

    user_ids.forEach((userId) => {
      const roomName = `user:${userId}`;
      n.to(roomName).emit(EVENTS.LESSON_REMINDER, message);
    });

    pinnoLogger.info(`Lesson reminder sent to ${user_ids.length} users`);
  } catch (e) {
    pinnoLogger.error("Error in lessonReminder event:", e);
    throw e;
  }
};
