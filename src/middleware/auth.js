import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { makeAuthenticatedRequest } from "../services/api.js";
import { extractAuthMetadata } from "../utils/auth.js";

export function authenticateSocket(socket, next) {
  try {
    const { token, isDev } = extractAuthMetadata(socket);

    if (!isDev) {
      logger.info("Production mode detected, checking token");
    }

    if (!token) {
      logger.error("Socket authentication failed: No token provided");
      const error = new Error("Authentication error: No token provided");
      error.data = { code: "AUTH_ERROR", namespace: socket.nsp?.name };
      return next(error);
    }

    jwt.verify(token, config.jwtPublicKey, async (err, _decoded) => {
      if (err) {
        logger.error("JWT verification error:", err);
        const error = new Error("Authentication error: Invalid token");
        error.data = { code: "AUTH_ERROR", namespace: socket.nsp?.name };
        return next(error);
      }

      try {
        const client = makeAuthenticatedRequest(token, isDev);
        logger.info(
          "Headers: " + JSON.stringify(client.defaults.headers.common, null, 2)
        );

        const response = await client.get("user/mini-details");

        if (response.status !== 200) {
          const message =
            response?.data?.message ||
            response?.response?.data?.message ||
            "Unknown error";
          logger.error(
            `API authentication error: Invalid response ${response?.status} and message ${message}`
          );
          const error = new Error("Authentication error: Invalid response");
          error.data = { code: "AUTH_ERROR", namespace: socket.nsp?.name };
          return next(error);
        }

        socket.user = response.data;
        socket.token = token;
        socket.isDev = isDev;

        logger.info(`User authenticated: ${socket.user.id || "unknown"}`);
        next();
      } catch (error) {
        logger.error("API authentication error:", error);
        const authError = new Error("Authentication error: Failed to fetch user details");
        authError.data = { code: "AUTH_ERROR", namespace: socket.nsp?.name };
        return next(authError);
      }
    });
  } catch (error) {
    logger.error("Unexpected error in authenticateSocket:", error);
    const authError = new Error("Authentication error: Unexpected error");
    authError.data = { code: "AUTH_ERROR", namespace: socket.nsp?.name };
    return next(authError);
  }
}

export function authenticateNamespace(namespace) {
  namespace.use(authenticateSocket);
  return namespace;
}
