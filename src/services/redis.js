import { createClient } from "@redis/client";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { createRedisOperations } from "../config/redis/redis-operations.js";
import pinnoLogger from "../utils/pinno-logger.js";

let redisClient = null;
let redisSubscriber = null;

export async function initRedisClient() {
  if (redisClient) return redisClient;

  const host = config.redis.connection.host;
  const port = config.redis.connection.port;
  const username = config.redis.connection.username;
  const password = config.redis.connection.password;
  const db = config.redis.connection.db;

  if (!host || !port || !username) {
    pinnoLogger.error({
      message: "Invalid Redis config, aborting connection",
      host,
      port,
      username,
      db,
    });
    throw new Error("Redis config is incomplete or invalid");
  }

  const redisUrl = `redis://${username}:${encodeURIComponent(
    password
  )}@${host}:${port}/${db}`;

  logger.info(`Connecting to Redis at ${host}:${port} with user ${username}`);

  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          pinnoLogger.error(
            "Too many Redis retries, stopping reconnect attempts."
          );
          return new Error("Retry limit reached");
        }
        return 1000;
      },
    },
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

  const channelList = Array.isArray(channels) ? channels : [channels];

  //  subscriber.on('message', (channelName, message) => {
  //   callback(message, channelName);
  // });

  // await subscriber.subscribe(...channels);

  await subscriber.subscribe(...channelList, (message) => {
    callback(message);
  });
  logger.info(`Subscribed to Redis channel: ${channelList}`);
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
