export const redisConfig = {
    url: process.env.REDIS_URL,
    host:process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    user: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '10', 10),
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
    subscriptionChannels: [
      'galaeducation_database_payments',
    ],
  };