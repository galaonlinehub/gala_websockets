import dotenv from 'dotenv';
import express from 'express';
import https from 'httpolyglot';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import mediasoup from 'mediasoup';
import { createClient } from '@redis/client';
import setupMessagingNamespace from './namespaces/messaging.js';
import setupPaymentNamespace from './namespaces/payment.js';
import setupSignalingNamespace from './namespaces/signaling.js';

dotenv.config();
const __dirname = path.resolve();
const app = express();

// Enable CORS
app.use(cors({
  origin: "*",
  credentials: true,
}));

// Basic route handling
app.get('*', (req, res, next) => {
  const path = '/sfu/';
  if (req.path.indexOf(path) === 0 && req.path.length > path.length) return next();
  res.send(`You need to specify a room name in the path e.g. 'https://localhost:3001/sfu/room'`);
});

app.use('/sfu/:room', express.static(path.join(__dirname, 'public')));

// SSL configuration
const sslOptions = {
  key: fs.readFileSync('./server/ssl/key.pem', 'utf-8'),
  cert: fs.readFileSync('./server/ssl/cert.pem', 'utf-8'),
};

const httpsServer = https.createServer(sslOptions, app);
const io = new Server(httpsServer, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const publicKey = process.env.PASSPORT_PUBLIC_KEY;

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.query.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  jwt.verify(token, publicKey, async (err, user) => {
    if (err) {
      console.log(err);
      return next(new Error('Authentication error: Invalid token'));
    }

    try {
      const res = await axios.get('https://galaweb.galahub.org/api/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      socket.user = res.data;
      next();
    } catch (apiError) {
      console.log(apiError);
      return next(new Error('Authentication error: Failed to fetch user details'));
    }
  });
};

// Redis setup
const redisClient = createClient({
  url: 'redis://default:Gala@2024@5.75.156.12:6379'
});

async function setupRedis() {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
    
    const subscriber = redisClient.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe('galaeducation_database_payments', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        
        if (parsedMessage.event === 'payments.event') {
          const { clientEmail:email, message: paymentMessage } = parsedMessage.data;
          paymentNamespace.to(email).emit('paymentResponse', paymentMessage);
          console.log(`Payment sent to ${email}:`, paymentMessage);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    console.log('Subscribed to Payments channel');
  } catch (error) {
    console.error('Redis setup error:', error);
  }
}


const createWorker = async () => {
  try {
    const worker = await mediasoup.createWorker({
      logLevel: 'debug',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    console.log(`MediaSoup Worker pid: ${worker.pid}`);

    worker.on('died', (error) => {
      console.error('MediaSoup Worker died:', error);
      setTimeout(() => process.exit(1), 2000);
    });

    return worker;
  } catch (error) {
    console.error('Error creating MediaSoup worker:', error);
    process.exit(1);
  }
};

// Initialize everything
async function initializeServer() {
  const worker = await createWorker();
  await setupRedis();

  // Setup namespaces
  setupMessagingNamespace(io, redisClient);
  setupPaymentNamespace(io);
  setupSignalingNamespace(io, worker, authenticateSocket);

  // Start the server
  const PORT = process.env.PORT || 3001;
  httpsServer.listen(PORT, () => {
    console.log(`MediaSoup Server running on port ${PORT}`);
  });
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

initializeServer();