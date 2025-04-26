import Redis from "ioredis";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

let redisClient = null;
let redisSubscriber = null;

export async function initRedisClient() {
  if (redisClient) return redisClient;

  const host = config.redis.host || process.env.REDIS_HOST || "5.75.156.12";
  const port = config.redis.port || process.env.REDIS_PORT || 6379;
  const username = config.redis.user || process.env.REDIS_USER || "default";
  const password =
    config.redis.password || process.env.REDIS_PASSWORD || "Gala@2024";
  const maxRetries =
    config.redis.maxRetries || process.env.REDIS_MAX_RETRIES || 10;
  const retryDelay =
    config.redis.retryDelay || process.env.REDIS_RETRY_DELAY || 1000;
  const db = config.redis.db || process.env.REDIS_DB || 0;

  logger.info(`Connecting to Redis at ${host}:${port} with user ${username}`);

  redisClient = new Redis({
    host,
    port,
    username,
    password,
    db,
    retryStrategy: (times) => {
      if (times > maxRetries) {
        logger.error(`Redis connection failed after ${times} attempts`);
        return false;
      }
      return retryDelay;
    },
  });

  redisClient.on("error", (err) => {
    logger.error("Redis client error:", err);
  });

  redisClient.on("connect", () => {
    logger.info("Connected to Redis");
  });

  await new Promise((resolve) => {
    redisClient.once("ready", resolve);
  });

  redisSubscriber = redisClient.duplicate();

  await new Promise((resolve) => {
    redisSubscriber.once("ready", () => {
      logger.info("Redis subscriber client connected");
      resolve();
    });
  });

  return redisClient;
}

// The rest of your functions remain the same

export function getRedisClient() {
  if (!redisClient) {
    throw new Error("Redis client has not been initialized");
  }
  return redisClient;
}

export function getRedisSubscriber() {
  if (!redisSubscriber) {
    throw new Error("Redis subscriber has not been initialized");
  }
  return redisSubscriber;
}

export async function subscribeToChannel(channel, callback) {
  const subscriber = getRedisSubscriber();
  await subscriber.subscribe(channel, callback);
  logger.info(`Subscribed to Redis channel: ${channel}`);
}

// database: config.redis.db,
// socket: {
//   reconnectStrategy: (retries) => {
//     if (retries > config.redis.maxRetries) {
//       logger.error(`Redis connection failed after ${retries} attempts`);
//       return new Error("Redis connection failed");
//     }
//     return config.redis.retryDelay;
//   },
// },
