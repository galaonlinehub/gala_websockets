import { envConfig } from './env/env.js';
import { redisConfig } from './redis/redis.js';
import { socketConfig } from './socket/socketio.js';

export const config = {
  ...envConfig,
  redis: redisConfig,
  socket: socketConfig,
};


