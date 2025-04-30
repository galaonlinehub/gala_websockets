import jwt from "jsonwebtoken";
import axios from "axios";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import api from "../services/api.js";

export function authenticateSocket(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
    socket.handshake.query?.token;
  logger.info("Socket authentication token:", token);
  logger.info("Full handshake", socket.handshake);

  logger.info("USER ID", socket.handshake.query.user_id);

  if (!token) {
    logger.error("Socket authentication failed: No token provided");
    return next(new Error("Authentication error: No token provided"));
  }

  jwt.verify(token, config.jwtPublicKey, async (err, decoded) => {
    // if (err) {
    //   logger.error("JWT verification error:", err);
    //   return next(new Error("Authentication error: Invalid token"));
    // }

    try {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      const response = await api.get(`user`);

      socket.user = response.data;
      socket.token = token;

      logger.info(`User authenticated: ${socket.user.id || "unknown"}`);
      next();
    } catch (error) {
      logger.error("API authentication error:", error);
      return next(
        new Error("Authentication error: Failed to fetch user details")
      );
    }
  });
}

export function authenticateNamespace(namespace) {
  namespace.use(authenticateSocket);
  return namespace;
}
