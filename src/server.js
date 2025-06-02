import https from "httpolyglot";
import fs from "fs";
import { createServer } from "http";
import { config } from "./config/index.js";
import { setupApp } from "./app.js";
import { initSocketIO } from "./services/socketio.js";
import {
  initializeRedisOperations,
  initRedisClient,
} from "./services/redis.js";

import { setupNamespaces } from "./namespaces/index.js";
import { logger } from "./utils/logger.js";
import pinnoLogger from "./utils/pinno-logger.js";

async function startServer() {
  logger.info("Starting server...");
  pinnoLogger.info(`Environment: ${config.env}`);

  try {
    const redisClient = await initRedisClient();
    const redisOps = initializeRedisOperations(redisClient);

    if (!redisOps) {
      logger.error("Failed to initialize Redis operations.");
      process.exit(1);
    }

    const app = setupApp();

    let server;
    if (config.env === "production" && config.ssl.enabled) {
      const sslOptions = {
        key: fs.readFileSync(config.ssl.keyPath, "utf-8"),
        cert: fs.readFileSync(config.ssl.certPath, "utf-8"),
      };
      server = https.createServer(sslOptions, app);
      logger.info("Created HTTPS server");
    } else {
      server = createServer(app);
      logger.info("Created HTTP server");
    }

    const io = initSocketIO(server);

    setupNamespaces(io, redisClient, redisOps);
    const PORT = config.port || 3000;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    setupGracefulShutdown(server, redisClient);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

function setupGracefulShutdown(server, redisClient) {
  const shutdown = async () => {
    logger.info("Shutting down server...");

    server.close(() => {
      logger.info("HTTP server closed");
    });

    try {
      await redisClient.disconnect();
      logger.info("Redis connection closed");
    } catch (error) {
      logger.error("Error closing Redis connection:", error);
    }

    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception:", error);
    shutdown();
  });

  process.on("unhandledRejection", (error) => {
    logger.error("Unhandled rejection:", error);
    shutdown();
  });
}

startServer();
