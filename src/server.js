// import dotenv from 'dotenv';
// import express from 'express';
// import https from 'httpolyglot';
// import fs from 'fs';
// import path from 'path';
// import { Server } from 'socket.io';
// import cors from 'cors';
// import jwt from 'jsonwebtoken';
// import mediasoup from 'mediasoup';
// import { createClient } from '@redis/client';
// import setupMessagingNamespace from './namespaces/messaging.js';
// import setupPaymentNamespace from './namespaces/payment.js';
// import setupSignalingNamespace from './namespaces/signaling.js';

// dotenv.config();
// const __dirname = path.resolve();
// const app = express();

// // Enable CORS
// app.use(cors({
//   origin: "*",
//   credentials: true,
// }));

// // Basic route handling
// app.get('*', (req, res, next) => {
//   const path = '/sfu/';
//   if (req.path.indexOf(path) === 0 && req.path.length > path.length) return next();
//   res.send(`You need to specify a room name in the path e.g. 'https://localhost:3001/sfu/room'`);
// });

// app.use('/sfu/:room', express.static(path.join(__dirname, 'public')));

// // SSL configuration
// const sslOptions = {
//   key: fs.readFileSync('./server/ssl/key.pem', 'utf-8'),
//   cert: fs.readFileSync('./server/ssl/cert.pem', 'utf-8'),
// };

// const httpsServer = https.createServer(sslOptions, app);
// const io = new Server(httpsServer, {
//   cors: {
//     origin: "*",
//     methods: ['GET', 'POST'],
//     credentials: true,
//   },
// });

// const publicKey = process.env.PASSPORT_PUBLIC_KEY;

// const authenticateSocket = (socket, next) => {
//   const token = socket.handshake.query.token;

//   if (!token) {
//     return next(new Error('Authentication error: No token provided'));
//   }

//   jwt.verify(token, publicKey, async (err, user) => {
//     if (err) {
//       console.log(err);
//       return next(new Error('Authentication error: Invalid token'));
//     }

//     try {
//       const res = await axios.get('https://galaweb.galahub.org/api/user', {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       socket.user = res.data;
//       next();
//     } catch (apiError) {
//       console.log(apiError);
//       return next(new Error('Authentication error: Failed to fetch user details'));
//     }
//   });
// };

// // Redis setup
// const redisClient = createClient({
//   url: 'redis://default:Gala@2024@5.75.156.12:6379'
// });

// async function setupRedis() {
//   try {
//     await redisClient.connect();
//     console.log('Connected to Redis');

//     const subscriber = redisClient.duplicate();
//     await subscriber.connect();

//     await subscriber.subscribe('galaeducation_database_payments', (message) => {
//       try {
//         const parsedMessage = JSON.parse(message);

//         if (parsedMessage.event === 'payments.event') {
//           const { clientEmail:email, message: paymentMessage } = parsedMessage.data;
//           paymentNamespace.to(email).emit('paymentResponse', paymentMessage);
//           console.log(`Payment sent to ${email}:`, paymentMessage);
//         }
//       } catch (error) {
//         console.error('Error processing message:', error);
//       }
//     });

//     console.log('Subscribed to Payments channel');
//   } catch (error) {
//     console.error('Redis setup error:', error);
//   }
// }

// const createWorker = async () => {
//   try {
//     const worker = await mediasoup.createWorker({
//       logLevel: 'debug',
//       logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
//       rtcMinPort: 40000,
//       rtcMaxPort: 49999,
//     });

//     console.log(`MediaSoup Worker pid: ${worker.pid}`);

//     worker.on('died', (error) => {
//       console.error('MediaSoup Worker died:', error);
//       setTimeout(() => process.exit(1), 2000);
//     });

//     return worker;
//   } catch (error) {
//     console.error('Error creating MediaSoup worker:', error);
//     process.exit(1);
//   }
// };

// // Initialize everything
// async function initializeServer() {

//   await setupRedis();

//   // Setup namespaces
//   setupPaymentNamespace(io);

//   // Start the server
//   const PORT = process.env.PORT || 3001;
//   httpsServer.listen(PORT, () => {
//     console.log(`MediaSoup Server running on port ${PORT}`);
//   });
// }

// // Error handling
// process.on('uncaughtException', (error) => {
//   console.error('Uncaught exception:', error);
// });

// process.on('unhandledRejection', (error) => {
//   console.error('Unhandled rejection:', error);
// });

// initializeServer();

import https from "httpolyglot";
import fs from "fs";
import { createServer } from "http";
import { config } from "./config/index.js";
import { setupApp } from "./app.js";
import { initSocketIO } from "./services/socketio.js";
import { initRedisClient } from "./services/redis.js";
import { setupNamespaces } from "./namespaces/index.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  try {
    const redisClient = await initRedisClient();
    const app = setupApp();

    let server;
    if (config.env === "production" && config.ssl.enabled) {
      const sslOptions = {
        key: fs.readFileSync(config.ssl.keyPath, "utf-8"),
        cert: fs.readFileSync(config.ssl.certPath, "utf-8"),
      };
      server = https.createServer(sslOptions, app);
      logger.info("Created HTTPS server");
    } else {
      server = createServer(app);
      logger.info("Created HTTP server");
    }

    const io = initSocketIO(server);

    setupNamespaces(io, redisClient);
    const PORT = config.port || 3000;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    setupGracefulShutdown(server, redisClient);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}


function setupGracefulShutdown(server, redisClient) {
  const shutdown = async () => {
    logger.info('Shutting down server...');
    
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    try {
      await redisClient.disconnect();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
    
    process.exit(0);
  };



  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown();
  });
  
  process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
    shutdown();
  });
}

startServer();