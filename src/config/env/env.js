import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { logger } from "../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "../../../");

const env = process.env.NODE_ENV;

if (!env) {
  logger.error("NODE_ENV is not set");
  throw new Error("NODE_ENV is not set");
}

const envPath = path.resolve(rootDir, `.env.${env}`);
logger.info(`Looking for env file at: ${envPath}`);

if (fs.existsSync(envPath)) {
  logger.info(`Loading env from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  logger.warn(`Env file not found at ${envPath}, using process.env values`);
}

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
