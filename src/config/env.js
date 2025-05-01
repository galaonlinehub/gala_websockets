import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

const env = process.env.NODE_ENV;
logger.info(`Environment: ${env}`);
logger.info(`path: ${path.resolve()}`);
if (!env) {
  logger.error("NODE_ENV is not set");
  throw new Error("NODE_ENV is not set");
}

dotenv.config({ path: `.env.${env}` });

export const envConfig = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  baseUrl: process.env.BASE_URL,
  apiBaseUrl: process.env.API_BASE_URL,
  jwtPublicKey:
    env === "production"
      ? fs.readFileSync(
          path.resolve("/var/www/laravel/storage/oauth-public.key"),
          "utf8"
        )
      : fs.readFileSync(
          path.resolve(
            "/Users/denismgaya/devs/Gala/Projects/Gala-web-app/storage/oauth-public.key"
          ),
          "utf8"
        ),
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : "*",
  serveStatic: process.env.SERVE_STATIC === "true",
  ssl: {
    enabled: process.env.SSL_ENABLED === "true",
    keyPath: process.env.SSL_KEY_PATH || "./server/ssl/key.pem",
    certPath: process.env.SSL_CERT_PATH || "./server/ssl/cert.pem",
  },
};
