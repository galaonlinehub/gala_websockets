export const redisConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '10', 10),
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
    subscriptionChannels: [
      'galaeducation_database_payments',
    ],
  };