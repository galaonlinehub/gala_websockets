import { createClient } from "@redis/client";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { createRedisOperations } from "../config/redis/redis-operations.js";

let redisClient = null;
let redisSubscriber = null;

export async function initRedisClient() {
  if (redisClient) return redisClient;

  const host = config.redis.connection.host;
  const port = config.redis.connection.port;
  const username = config.redis.connection.user;
  const password = config.redis.connection.password;
  const db = config.redis.connection.db;

  const redisUrl = `redis://${username}:${encodeURIComponent(
    password
  )}@${host}:${port}/${db}`;

  logger.info(`Connecting to Redis at ${host}:${port} with user ${username}`);

  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on("error", (err) => {
    logger.error("Redis client error:", err);
  });

  await redisClient.connect();
  logger.info("Connected to Redis");

  redisSubscriber = redisClient.duplicate();
  redisSubscriber.on("error", (err) => {
    logger.error("Redis subscriber error:", err);
  });

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

export async function subscribeToChannel(channels, callback) {
  const subscriber = getRedisSubscriber();

  if (!channels) {
    throw new Error("No channel specified for subscription");
  }

  const channel = Array.isArray(channels) ? channels : [channels];

  await subscriber.subscribe(...channels, (message) => {
    callback(message);
  });
  logger.info(`Subscribed to Redis channel: ${channel}`);
}

export const initializeRedisOperations = (redisClient) => {
  if (!redisClient) {
    throw new Error("Redis client has not been initialized");
  }

  let redisOps = null;

  if (!redisOps) {
    redisOps = createRedisOperations(redisClient);
  }
  return redisOps;
};
