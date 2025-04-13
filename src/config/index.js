import { envConfig } from './env.js';
import { redisConfig } from './redis.js';
import { socketConfig } from './socketio.js';
// import { mediasoupConfig } from './mediasoup.js';

export const config = {
  ...envConfig,
  redis: redisConfig,
  socket: socketConfig,
  // mediasoup: mediasoupConfig,
};


