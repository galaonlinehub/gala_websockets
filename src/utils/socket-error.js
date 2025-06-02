import { EVENTS } from "../config/socket/events.js";
import pinnoLogger from "./pinno-logger.js";

export const emitSocketError = (socket, error, shouldDisconnect = false) => {
  if (!socket || !error) {
    console.error("emitSocketError: Invalid socket or error object");
    return;
  }

  const errorMessage = error?.message || "An unknown error occurred";
  const errorDetails = error?.details || "No additional details provided";

  const errorData = {
    message: errorMessage,
    details: errorDetails,
  };

  socket.emit(EVENTS.ERROR, errorData);

  pinnoLogger.error({
    message: "Socket Error:",
    error: errorMessage,
    details: errorDetails,
  });

  if (shouldDisconnect) {
    socket.disconnect(true);
  }
};
