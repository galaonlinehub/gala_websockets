import { createClient } from "@redis/client";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

let redisClient = null;
let redisSubscriber = null;

export async function initRedisClient() {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: "redis://:Gala@2024@5.75.156.12:6379",

    // database: 0,
    // url: config.redis.url,
    // password: config.redis.password,
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

// import { createClient } from "@redis/client";
// import { config } from "../config/index.js";
// import { logger } from "../utils/logger.js";

// let redisClient = null;
// let redisSubscriber = null;

// export async function initRedisClient() {
//   if (redisClient) return redisClient;

//   redisClient = createClient({
//     url: 'redis://default:Gala@2024@5.75.156.12:6379',
//     database: 0,
//     socket: {
//       reconnectStrategy: (retries) => {
//         if (retries > config.redis.maxRetries) {
//           logger.error(`Main Redis connection failed after ${retries} attempts`);
//           return new Error("Redis connection failed");
//         }
//         return config.redis.retryDelay;
//       },
//     },
//   });

//   redisClient.on("error", (err) => {
//     logger.error("Main Redis client error:", err);
//   });

//   redisClient.on("connect", () => {
//     logger.info("Main Redis client connected");
//   });

//   redisClient.on("ready", () => {
//     logger.info("Main Redis client ready");
//   });

//   try {
//     await redisClient.connect();
//     const pong = await redisClient.ping();
//     logger.info("Main Redis PING:", pong);
//   } catch (err) {
//     logger.error("Main Redis connection failed:", err);
//     throw err;
//   }

//   // Create a separate subscriber client explicitly
//   redisSubscriber = createClient({
//     url: 'redis://default:Gala@2024@5.75.156.12:6379',
//     database: 0,
//     socket: {
//       reconnectStrategy: (retries) => {
//         if (retries > config.redis.maxRetries) {
//           logger.error(`Subscriber Redis connection failed after ${retries} attempts`);
//           return new Error("Redis connection failed");
//         }
//         return config.redis.retryDelay;
//       },
//     },
//   });

//   redisSubscriber.on("error", (err) => {
//     logger.error("Subscriber Redis client error:", err);
//   });

//   redisSubscriber.on("connect", () => {
//     logger.info("Subscriber Redis client connected");
//   });

//   redisSubscriber.on("ready", () => {
//     logger.info("Subscriber Redis client ready");
//   });

//   try {
//     await redisSubscriber.connect();
//     const pong = await redisSubscriber.ping();
//     logger.info("Subscriber Redis PING:", pong);
//   } catch (err) {
//     logger.error("Subscriber Redis connection failed:", err);
//     throw err;
//   }

//   return redisClient;
// }

// export function getRedisClient() {
//   if (!redisClient) {
//     throw new Error("Redis client has not been initialized");
//   }
//   return redisClient;
// }

// export function getRedisSubscriber() {
//   if (!redisSubscriber) {
//     throw new Error("Redis subscriber has not been initialized");
//   }
//   return redisSubscriber;
// }

// export async function subscribeToChannel(channel, callback) {
//   try {
//     const subscriber = getRedisSubscriber();
//     await subscriber.subscribe(channel, callback);
//     logger.info(`Subscribed to Redis channel: ${channel}`);
//   } catch (err) {
//     logger.error(`Failed to subscribe to channel ${channel}:`, err);
//     throw err;
//   }
// }
