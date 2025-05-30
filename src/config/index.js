import { envConfig } from './env.js';
import { redisConfig } from './redis/redis.js';
import { socketConfig } from './socketio.js';

export const config = {
  ...envConfig,
  redis: redisConfig,
  socket: socketConfig,
};


