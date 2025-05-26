import { RedisKeys } from "./redis-keys.js";
import { RedisTTLs } from "./redis-ttls.js";
import { RedisOperations } from "./redis-operations.js";

export const redisConfig = {
  connection: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0", 10),
  },
  options: {
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || "10", 10),
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || "1000", 10),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || "10000", 10),
    lazyConnect: true,
  },
  keys: RedisKeys,
  ttl: RedisTTLs,
  operations: RedisOperations,
  channels: ["galaeducation_database_payments"],
};

export const deleteRedisKey = async (client, key) => {
  return await client.del(key);
};

export const keyExists = async (client, key) => {
  return await client.exists(key);
};

export const getKeyTTL = async (client, key) => {
  return await client.ttl(key);
};
