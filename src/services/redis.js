import { createClient } from "@redis/client";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

let redisClient = null;
let redisSubscriber = null;

export async function initRedisClient() {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: config.redis.url,
    password: config.redis.password,
   
  });

  redisClient.on("error", (err) => {
    logger.error("Redis client error:", err);
  });

  redisClient.on("connect", () => {
    logger.info("Connected to Redis");
  });

  await redisClient.connect();

  redisSubscriber = redisClient.duplicate();
  await redisSubscriber.connect();

  logger.info("Redis subscriber client connected");

  return redisClient;
}

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