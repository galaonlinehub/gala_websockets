import { EVENTS } from "../config/socket/events.js";
import pinnoLogger from "./pinno-logger.js";

export const emitSocketError = (socket, error, shouldDisconnect = false) => {
  if (!socket || !error) {
    pinnoLogger.error("emitSocketError: Invalid socket or error object");
    return;
  }

  const errorMessage = error?.message || "An unknown error occurred";

  socket.emit(EVENTS.ERROR, errorMessage);

  pinnoLogger.error({
    message: "Socket Error:",
    error: errorMessage,
  });

  if (shouldDisconnect) {
    socket.disconnect(true);
  }
};
