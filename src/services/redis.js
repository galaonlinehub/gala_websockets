import Redis from "ioredis";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

let redisClient = null;
let redisSubscriber = null;

export async function initRedisClient() {
  if (redisClient) return redisClient;

  redisClient = new Redis({
    host: "5.75.156.12",
    port: 6379,
    username: "default", // Explicitly set username
    password: "Gala@2024", // Use exactly what worked in the CLI
    db: config.redis.db || 0,
    retryStrategy: (times) => {
      if (times > config.redis.maxRetries) {
        logger.error(`Redis connection failed after ${times} attempts`);
        return false;
      }
      return config.redis.retryDelay;
    },
  });

  redisClient.on("error", (err) => {
    logger.error("Redis client error:", err);
  });

  redisClient.on("connect", () => {
    logger.info("Connected to Redis");
  });

  // Wait for client to be ready before proceeding
  await new Promise((resolve) => {
    redisClient.once("ready", resolve);
  });

  redisSubscriber = redisClient.duplicate();

  // Wait for subscriber to be ready
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
