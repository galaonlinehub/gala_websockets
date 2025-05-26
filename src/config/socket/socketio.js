
import { envConfig } from './env.js';

export const socketConfig = {
  cors: {
    origin: envConfig.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 10e6,
  pingTimeout: 60000,
  pingInterval: 25000,
};
