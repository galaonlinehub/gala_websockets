import express from 'express';
import https from 'httpolyglot';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';
import cors from 'cors';
import mediasoup from 'mediasoup';

const __dirname = path.resolve();
const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://localhost:3000',
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
    origin: process.env.CORS_ORIGIN || 'https://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.query.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  jwt.verify(token, publicKey, async (err, user) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }

    try {
      const res = await axios.get('http://localhost:8000/api/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      socket.user = res.data;
      next();
    } catch (apiError) {
      return next(new Error('Authentication error: Failed to fetch user details'));
    }
  });
};


// Namespace for signaling
const signalingNamespace = io.of('/signaling').use(authenticateSocket);

// Global variables
let worker;
let rooms = {};    // { roomName1: { router, peers: [socketId1, socketId2, ...] }, ... }
let peers = {};    // { socketId1: { socket, roomName, transports: [], producers: [], consumers: [], peerDetails: {} }, ... }
let transports = [];  // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = [];   // [ { socketId1, roomName1, producer }, ... ]
let consumers = [];   // [ { socketId1, roomName1, consumer }, ... ]

// MediaSoup worker configuration
const createWorker = async () => {
  try {
    worker = await mediasoup.createWorker({
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

// Create worker on startup
worker = createWorker();

// Supported media codecs
const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': 1000,
    },
  },
];

// WebRTC Transport options
const createWebRtcTransport = async (router) => {
  return new Promise(async (resolve, reject) => {
    try {
      const transport = await router.createWebRtcTransport({
        listenIps: [
          {
            ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
            announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '192.168.100.105',
          },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
        minimumAvailableOutgoingBitrate: 600000,
        maxSctpMessageSize: 262144,
        maxIncomingBitrate: 1500000,
      });

      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          transport.close();
        }
      });

      transport.on('close', () => {
        console.log('Transport closed');
      });

      resolve(transport);
    } catch (error) {
      reject(error);
    }
  });
};

// Socket connection handling within signaling namespace
signalingNamespace.on('connection', async socket => {
  console.log('New connection:', socket.id);
  
  socket.emit('connection-success', {
    socketId: socket.id,
    existingProducers: producers,
  });

  const removeItems = (items, socketId, type) => {
    items.forEach(item => {
      if (item.socketId === socketId) {
        item[type].close();
      }
    });
    return items.filter(item => item.socketId !== socketId);
  };

  socket.on('disconnect', () => {
    console.log('Peer disconnected:', socket.id);
    
    // Cleanup resources
    consumers = removeItems(consumers, socket.id, 'consumer');
    producers = removeItems(producers, socket.id, 'producer');
    transports = removeItems(transports, socket.id, 'transport');

    if (peers[socket.id]) {
      const { roomName } = peers[socket.id];
      
      if (rooms[roomName]) {
        rooms[roomName].peers = rooms[roomName].peers.filter(sid => sid !== socket.id);
        
        // Remove room if empty
        if (rooms[roomName].peers.length === 0) {
          delete rooms[roomName];
        }
      }
      
      delete peers[socket.id];
    }

    // Notify other peers about disconnection
    socket.broadcast.emit('peer-disconnected', { socketId: socket.id });
  });

  const createRoom = async (roomName, socketId) => {
    let router;
    let peers = [];

    if (rooms[roomName]) {
      router = rooms[roomName].router;
      peers = rooms[roomName].peers;
    } else {
      router = await worker.createRouter({ mediaCodecs });
    }
    
    console.log(`Router ID: ${router.id}`, peers.length);

    rooms[roomName] = {
      router,
      peers: [...peers, socketId],
    };

    return router;
  };

  socket.on('joinRoom', async ({ roomName }, callback) => {
    try {

      const res = await axios.get(`http://localhost:8000/verify_meeting/${roomName}`);

      if(res.data){
        if(res.status === 200){

       
      socket.join(roomName);
      const router = await createRoom(roomName, socket.id);
  
      peers[socket.id] = {
        socket,
        roomName,
        transports: [],
        producers: [],
        consumers: [],
        peerDetails: {
          name: '',
          isAdmin: false,
        }
      };
  
      // Get existing producers in this room
      const existingProducers = producers
        .filter(producer => producer.roomName === roomName && producer.socketId !== socket.id)
        .map(producer => ({
          producerId: producer.producer.id,
          socketId: producer.socketId
        }));
  
      // Get Router RTP Capabilities
      const rtpCapabilities = router.rtpCapabilities;
  
      // Send both capabilities and existing producers
      callback({ 
        rtpCapabilities,
        existingProducers  // Add this
      });
  
      console.log(`Peer ${socket.id} joined room: ${roomName}`);
  
      // Notify other peers
      socket.broadcast.to(roomName).emit('peer-joined', {
        socketId: socket.id,
        producerIds: producers
          .filter(producer => producer.roomName === roomName)
          .map(producer => producer.producer.id)
      }); }
    }
    
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ error: error.message });
    }
  });

  socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
    try {
      const roomName = peers[socket.id].roomName;
      const router = rooms[roomName].router;

      const transport = await createWebRtcTransport(router);
      
      transports.push({
        socketId: socket.id,
        transport,
        roomName,
        consumer: consumer || false,
      });

      peers[socket.id].transports.push(transport.id);

      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        }
      });
    } catch (error) {
      console.error('Error creating WebRTC transport:', error);
      callback({ error: error.message });
    }
  });

  socket.on('transport-connect', async ({ dtlsParameters, transportId }) => {
    try {
      console.log('Available transports:', transports.map(t => t.transport.id));
      console.log('Transport ID received:', transportId);

      const transport = transports.find(t => t.transport.id === transportId);
      if (!transport) {
        throw new Error('Transport not found');
      }
      await transport.transport.connect({ dtlsParameters });
    } catch (error) {
      console.error('Error connecting transport:', error);
    }
  });

  socket.on('transport-produce', async ({ kind, rtpParameters, appData, transportId }, callback) => {
    try {

      console.log("The transport produced called nad it  is",transportId);

      const transport = transports.find(t => t.transport.id === transportId);
      if (!transport) {
        throw new Error('Transport not found');
      }

      const producer = await transport.transport.produce({
        kind,
        rtpParameters,
        appData
        
      });

      const { roomName } = peers[socket.id];

      producers.push({
        socketId: socket.id,
        producer,
        roomName,
      });

      peers[socket.id].producers.push(producer.id);

      // Notify other peers in the room
      socket.broadcast.to(roomName).emit('new-producer', {
        producerId: producer.id,
        socketId: socket.id,
      });

      producer.on('transportclose', () => {
        producer.close();
      });

      callback({ id: producer.id });
    } catch (error) {
      console.error('Error in transport-produce:', error);
      callback({ error: error.message });
    }
  });

  socket.on('transport-recv-connect', async ({ dtlsParameters, serverConsumerTransportId }) => {
    try {
      const transport = transports.find(t => 
        t.consumer && t.transport.id === serverConsumerTransportId
      );
      if (!transport) {
        throw new Error('Consumer transport not found');
      }
      await transport.transport.connect({ dtlsParameters });
    } catch (error) {
      console.error('Error connecting consumer transport:', error);
    }
  });

  socket.on('consume', async ({ rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback) => {
    try {
      const { roomName } = peers[socket.id];
      const router = rooms[roomName].router;
      const transport = transports.find(t => 
        t.consumer && t.transport.id === serverConsumerTransportId
      );

      if (!transport) {
        throw new Error('Consumer transport not found');
      }

      if (!router.canConsume({
        producerId: remoteProducerId,
        rtpCapabilities,
      })) {
        throw new Error('Cannot consume this producer');
      }

      const consumer = await transport.transport.consume({
        producerId: remoteProducerId,
        rtpCapabilities,
        paused: true,
      });

      console.log('New consumer: created', consumer);


      consumers.push({
        socketId: socket.id,
        consumer,
        roomName,
      });

      peers[socket.id].consumers.push(consumer.id);

      consumer.on('transportclose', () => {
        consumer.close();
      });

      consumer.on('producerclose', () => {
        socket.emit('producer-closed', { remoteProducerId });
        consumer.close();
        consumers = consumers.filter(c => c.consumer.id !== consumer.id);
        peers[socket.id].consumers = peers[socket.id].consumers.filter(id => id !== consumer.id);
      });

      callback({
        params: {
          id: consumer.id,
          producerId: remoteProducerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          serverConsumerId: consumer.id,
        }
      });
    } catch (error) {
      console.error('Error in consume:', error);
      callback({ error: error.message });
    }
  });

  socket.on('consumer-resume', async ({ serverConsumerId }) => {
    try {
      const { consumer } = consumers.find(c => c.consumer.id === serverConsumerId);
      if (!consumer) {
        throw new Error('Consumer not found');
      }
      await consumer.resume();
    } catch (error) {
      console.error('Error resuming consumer:', error);
    }
  });

  socket.on('getProducers', async (callback) => {
    try {
      console.log("The producers present are",peers[socket.id]);
      const { roomName } = peers[socket.id];

      const producerList = producers
        .filter(p => p.socketId !== socket.id && p.roomName === roomName)
        .map(p => p.producer.id);

      callback(producerList);
    } catch (error) {
      console.error('Error getting producers:', error);
      callback({ error: error.message });
    }
  });
});


// Start the server
const PORT = process.env.PORT || 3001;
httpsServer.listen(PORT, () => {
  console.log(`MediaSoup Server running on port ${PORT}`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});
