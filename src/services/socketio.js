import { Server } from "socket.io";
import { socketConfig } from "../config/socket/socketio.js";
import { logger } from "../utils/logger.js";

let io = null;

export function initSocketIO(server) {
  if (io) return io;

  io = new Server(server, socketConfig);

  logger.info("Socket.IO initialized");

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }
  return io;
}
