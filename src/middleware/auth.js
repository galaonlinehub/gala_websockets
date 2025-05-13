import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import api from "../services/api.js";

export function authenticateSocket(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
    socket.handshake.query?.token;

  const isDev =
    socket.handshake.query?.mode === "development" ||
    socket.handshake.headers?.host?.includes("localhost");

  if (!isDev) {
    logger.info("Production mode detected, checking token");
  }

  if (!token) {
    logger.error("Socket authentication failed: No token provided");
    return next(new Error("Authentication error: No token provided"));
  }

  jwt.verify(token, config.jwtPublicKey, async (err, decoded) => {
    if (err) {
      logger.error("JWT verification error:", err);
      return next(new Error("Authentication error: Invalid token"));
    }

    try {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      if (isDev) {
        api.defaults.headers.common["X-Dev-Request"] = "true";
        logger.info("WE ARE IN HERE ITS DEV MODE");
      }else{
        logger.info("ITS PRODUCTION MODE");
      }

      api.defaults.headers.common["X-Source"] = "sfu";

      // logger.info(`Headers: ${JSON.stringify(api.defaults.headers.common, null, 2)}`);

      const response = await api.get("user");

      if (response.status !== 200) {
        const message =
          response?.data?.message ||
          response?.response?.data?.message ||
          "Unknown error";
        logger.error(
          `API authentication error: Invalid response ${response?.status} and message ${message}`
        );
        return next(new Error("Authentication error: Invalid response"));
      }

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
