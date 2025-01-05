// // // Import required packages
// // const express = require('express');
// // const http = require('http');
// // const { Server } = require('socket.io');
// // const jwt = require('jsonwebtoken');
// // const dotenv = require('dotenv');
// // const { createAdapter } = require('@socket.io/redis-adapter');
// // const { createClient } = require('redis');
// // const { default: axios } = require('axios');

// // // Load environment variables from .env file
// // dotenv.config();

// // // Initialize Express app
// // const app = express();
// // const server = http.createServer(app);

// // // Initialize Redis clients
// // const pubClient = createClient({ host: '127.0.0.1', port: 6379 });
// // const subClient = pubClient.duplicate();

// // // Initialize Socket.IO
// // const io = new Server(server, {
// //   cors: {
// //     origin: 'http://localhost:3000', // Update with your frontend's URL
// //     methods: ['GET', 'POST'],
// //     credentials: true,
// //   },
// // });

// // // Apply Redis adapter
// // io.adapter(createAdapter(pubClient, subClient));

// // // Load public/private keys
// // const publicKey = process.env.PASSPORT_PUBLIC_KEY;

// // // Middleware: Authenticate JWT for WebSocket
// // const authenticateSocket = (socket, next) => {
// //   const token = socket.handshake.query.token;

// //   if (!token) {
// //     return next(new Error('Authentication error: No token provided'));
// //   }

// //   jwt.verify(token, publicKey, async (err, user) => {
// //     if (err) {
// //       return next(new Error('Authentication error: Invalid token'));
// //     }

// //     try {
// //       const res = await axios.get('http://localhost:8000/api/user', {
// //         headers: {
// //           Authorization: `Bearer ${token}`,
// //         },
// //       });
// //       socket.user = res.data;
// //       next();
// //     } catch (apiError) {
// //       return next(new Error('Authentication error: Failed to fetch user details'));
// //     }
// //   });
// // };

// // // Apply authentication middleware to namespaces
// // const signalingNamespace = io.of('/signaling').use(authenticateSocket);
// // const appNamespace = io.of('/app').use(authenticateSocket);

// // // ------------------------- AppNamespace Events -------------------------
// // appNamespace.on('connection', (socket) => {
// //   console.log(`AppNamespace: User connected: ${JSON.stringify(socket.user)}`);
// //   console.log(`Socket ID: ${socket.id}`);
// //   appNamespace.emit("testEvent",{message:"hello world from frank"})
// //   // Handle user joining a room
// //   socket.on('joinRoom', (roomId) => {
// //     if (!roomId) {
// //       console.error('AppNamespace: Missing roomId in joinRoom event');
// //       return socket.emit('error', { message: 'Room ID is required' });
// //     }

// //     socket.join(roomId);
// //     console.log(`AppNamespace: User ${socket.user.id} joined room ${roomId}`);

// //     // Notify the user
// //     socket.emit('roomJoined', { roomId });

// //     // Notify other users in the room
// //     io.to(roomId).emit('userJoined', { userId: socket.user.id });
// //   });

// //   // Handle messages
// //   socket.on('message', ({ roomId, message }) => {
// //     if (!roomId || !message) {
// //       console.error('AppNamespace: Invalid message payload');
// //       // return socket.emit('error', { message: 'Room ID and message are required' });
// //     }

// //     console.log(`AppNamespace: Message from ${socket.user.id} in room ${roomId}: ${message}`);

// //     // Broadcast the message to the room
// //     socket.to(roomId).emit('message', { user: socket.user.id, message });
// //     appNamespace.emit('message', { message:"Message from the backend" });
// //   });

// //   socket.on("joinTopics", (topics) => {
// //     topics.forEach((topicId) => {
// //       socket.join(topicId);
// //       console.log(`User ${socket.id} joined topic ${topicId}`);
// //     });
// //   });

// //   // Emit reminders to a specific topic
// //   socket.on("sendReminder", ({ topicId, reminder }) => {
// //     io.to(topicId).emit("newReminder", reminder);
// //   });

// //   // Handle notifications
// //   socket.on('notify', ({ roomId, notification }) => {
// //     if (!roomId || !notification) {
// //       console.error('AppNamespace: Invalid notification payload');
// //       return socket.emit('error', { message: 'Room ID and notification are required' });
// //     }

// //     console.log(`AppNamespace: Notification for room ${roomId}: ${notification}`);
// //     socket.to(roomId).emit('notify', { user: socket.user.id, notification });
// //   });

// //   // Handle disconnection
// //   socket.on('disconnect', () => {
// //     console.log(`AppNamespace: User disconnected: ${socket.user?.id}`);
// //   });

// //   // Error handling
// //   socket.on('connect_error', (error) => {
// //     console.error('AppNamespace Connection Error:', error.message);
// //   });

// //   socket.on('error', (error) => {
// //     console.error('AppNamespace Socket Error:', error.message);
// //   });
// // });

// // // ------------------------- SignalingNamespace Events -------------------------
// // signalingNamespace.on('connection', (socket) => {
// //   console.log(`SignalingNamespace: User connected: ${JSON.stringify(socket.user)}`);
// //   console.log(`Socket ID: ${socket.id}`);

// //   signalingNamespace.emit("newConnectionConfirmed","New message received")
// //   // Handle joining a signaling room
// //   socket.on('joinRoom', (roomId) => {
// //     if (!roomId) {
// //       console.error('SignalingNamespace: Missing roomId in joinRoom event');
// //       return socket.emit('error', { message: 'Room ID is required' });
// //     }

// //     socket.join(roomId);
// //     const userList = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
// //     socket.to(roomId).emit('roomDetails', { isCreator: false, userList });


// //     // Notify the user
// //     socket.emit('roomJoined', { roomId });

// //     // Notify other users in the room
// //     socket.to(roomId).emit('userJoined', { userId: socket.user.id });
// //   });

// //   // Handle WebRTC signaling messages
// //   socket.on('signal', ({ roomId, signal }) => {
// //     if (!roomId || !signal) {
// //       console.error('SignalingNamespace: Invalid signaling payload');
// //       return socket.emit('error', { message: 'Room ID and signaling data are required' });
// //     }

// //     console.log(`SignalingNamespace: Signal from ${socket.user.id} in room ${roomId}:`, signal);

// //     // Forward the signal to other peers in the room
// //     socket.to(roomId).emit('signal', { userId: socket.user.id, signal });
// //   });

// //   // signal
  

// //   socket.on('chatMessage', ({ roomId, message }) => {
// //     if (!roomId || !message) {
// //       console.error('SignalingNamespace: Invalid chat message payload');
// //       return socket.emit('error', { message: 'Room ID and message are required' });
// //     }
                                       
// //     console.log(`SignalingNamespace: Chat message from ${socket.user.id} in room ${roomId}: ${message}`);

// //     // Broadcast the chat message to the room
// //     socket.to(roomId).emit('chatMessage', { userId: socket.user.id, message });
// //   });
// //   // Ice candidate
// //   socket.on('iceCandidate', ({ roomId, candidate }) => {
// //     socket.to(roomId).emit('iceCandidate', { user: socket.user.id, candidate });
// //   }); 


// //   // Handle disconnection
// //   socket.on('disconnect', () => {
// //     console.log(`SignalingNamespace: User disconnected: ${socket.user?.id}`);
// //   });

// //   // Error handling
// //   socket.on('connect_error', (error) => {
// //     console.error('SignalingNamespace Connection Error:', error.message);
// //   });

// //   socket.on('error', (error) => {
// //     console.error('SignalingNamespace Socket Error:', error.message);
// //   });
// // });



// // // ------------------------- Redis Event Subscription -------------------------
// // pubClient.on('ready', () => {
// //   console.log('Connected to Redis');
// // });

// // pubClient.subscribe('galaeducation_database_reminders', () => {
// //   console.log('Subscribed to Reminders channel');
// // });

// // pubClient.on('message', (channel, message) => {
// //   console.log(`Message from ${channel}: ${message}`);

// //   try {
// //     // Parse the Redis message
// //     const parsedMessage = JSON.parse(message);

// //     // Check if the message is a reminder event
// //     if (channel === 'galaeducation_database_reminders' && parsedMessage.event === 'reminders.event') {
// //       const { reminder, topic } = parsedMessage.data;

// //       if (!reminder || !topic) {
// //         console.error('Invalid reminder data or topic ID');
// //         return;
// //       }

// //       // Emit the reminder to users in the topic
// //       appNamespace.to(topic).emit('newReminder', reminder);
// //       console.log(`Emitted newReminder to topic ${topic}:`, reminder);
// //     }
// //   } catch (error) {
// //     console.error('Error processing Redis message:', error.message);
// //   }
// // });

// // // ------------------------- Health Check Endpoint -------------------------
// // app.get('/health', (req, res) => {
// //   res.status(200).send({ status: 'OK', message: 'Server is running!' });
// // });

// // // ------------------------- Start Server -------------------------
// // const PORT = process.env.PORT || 3001;
// // server.listen(PORT, () => {
// //   console.log(`Server running on port ${PORT}`);
// // });


// Import required packages
// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');
// const { createAdapter } = require('@socket.io/redis-adapter');
// const { createClient } = require('redis');
// const { default: axios } = require('axios');
// const mediasoup = require('mediasoup');

// // Load environment variables from .env file
// dotenv.config();

// // Initialize Express app
// const app = express();
// const server = http.createServer(app);

// // Initialize Redis clients
// const pubClient = createClient({ host: '127.0.0.1', port: 6379 });
// const subClient = pubClient.duplicate();

// // Initialize Socket.IO
// const io = new Server(server, {
//   cors: {
//     origin: 'http://localhost:3000', // Update with your frontend's URL
//     methods: ['GET', 'POST'],
//     credentials: true,
//   },
// });

// // Apply Redis adapter
// io.adapter(createAdapter(pubClient, subClient));

// // Load public/private keys
// const publicKey = process.env.PASSPORT_PUBLIC_KEY;

// // Middleware: Authenticate JWT for WebSocket
// const authenticateSocket = (socket, next) => {
//   const token = socket.handshake.query.token;

//   if (!token) {
//     return next(new Error('Authentication error: No token provided'));
//   }

//   jwt.verify(token, publicKey, async (err, user) => {
//     if (err) {
//       return next(new Error('Authentication error: Invalid token'));
//     }

//     try {
//       const res = await axios.get('http://localhost:8000/api/user', {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       socket.user = res.data;
//       next();
//     } catch (apiError) {
//       return next(new Error('Authentication error: Failed to fetch user details'));
//     }
//   });
// };

// // Apply authentication middleware to namespaces
// const signalingNamespace = io.of('/signaling').use(authenticateSocket);
// const appNamespace = io.of('/app').use(authenticateSocket);

// // ------------------------- AppNamespace Events -------------------------
// appNamespace.on('connection', (socket) => {
//   console.log(`AppNamespace: User connected: ${JSON.stringify(socket.user)}`);
//   console.log(`Socket ID: ${socket.id}`);
//   appNamespace.emit("testEvent",{message:"hello world from frank"})
//   // Handle user joining a room
//   socket.on('joinRoom', (roomId) => {
//     if (!roomId) {
//       console.error('AppNamespace: Missing roomId in joinRoom event');
//       return socket.emit('error', { message: 'Room ID is required' });
//     }

//     socket.join(roomId);
//     console.log(`AppNamespace: User ${socket.user.id} joined room ${roomId}`);

//     // Notify the user
//     socket.emit('roomJoined', { roomId });

//     // Notify other users in the room
//     io.to(roomId).emit('userJoined', { userId: socket.user.id });
//   });

//   // Handle messages
//   socket.on('message', ({ roomId, message }) => {
//     if (!roomId || !message) {
//       console.error('AppNamespace: Invalid message payload');
//       // return socket.emit('error', { message: 'Room ID and message are required' });
//     }

//     console.log(`AppNamespace: Message from ${socket.user.id} in room ${roomId}: ${message}`);

//     // Broadcast the message to the room
//     socket.to(roomId).emit('message', { user: socket.user.id, message });
//     appNamespace.emit('message', { message:"Message from the backend" });
//   });

//   socket.on("joinTopics", (topics) => {
//     topics.forEach((topicId) => {
//       socket.join(topicId);
//       console.log(`User ${socket.id} joined topic ${topicId}`);
//     });
//   });

//   // Emit reminders to a specific topic
//   socket.on("sendReminder", ({ topicId, reminder }) => {
//     io.to(topicId).emit("newReminder", reminder);
//   });

//   // Handle notifications
//   socket.on('notify', ({ roomId, notification }) => {
//     if (!roomId || !notification) {
//       console.error('AppNamespace: Invalid notification payload');
//       return socket.emit('error', { message: 'Room ID and notification are required' });
//     }

//     console.log(`AppNamespace: Notification for room ${roomId}: ${notification}`);
//     socket.to(roomId).emit('notify', { user: socket.user.id, notification });
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     console.log(`AppNamespace: User disconnected: ${socket.user?.id}`);
//   });

//   // Error handling
//   socket.on('connect_error', (error) => {
//     console.error('AppNamespace Connection Error:', error.message);
//   });

//   socket.on('error', (error) => {
//     console.error('AppNamespace Socket Error:', error.message);
//   });
// });

// // ------------------------- SignalingNamespace with Mediasoup -------------------------


// const rooms = {}; // Store rooms and participants
// const routers = {};

// signalingNamespace.on('connection', (socket) => {
//   console.log(`SignalingNamespace: User connected: ${JSON.stringify(socket.user)}`);
//   console.log(`Socket ID: ${socket.id}`);

//   socket.on('joinRoom', async ({ roomId }, callback) => {
//     if (!rooms[roomId]) {
//       rooms[roomId] = { participants: [], producers: [], transports: [] };
//     }

//     const participant = { id: socket.id, user: socket.user };
//     rooms[roomId].participants.push(participant);
//     socket.join(roomId);

//     signalingNamespace.to(roomId).emit('participantJoined', { participant });
//     callback({ 
//       roomInfo: rooms[roomId], 
//       participants: rooms[roomId].participants,
//       producers: rooms[roomId].producers.map(p => ({
//       producerId: p.id,
//       producerSocketId: p.socketOwner
//       }))
//     });
    
//     });

  
//   socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => {
//     try {
      
//       if (!routers[roomId]) {
//         // Initialize mediasoup router if not already created
//         const worker = await mediasoup.createWorker();
//         routers[roomId] = await worker.createRouter({ mediaCodecs: [
//           {
//             kind: 'audio',
//             mimeType: 'audio/opus',
//             clockRate: 48000,
//             channels: 2
//           },
//           {
//             kind: 'video',
//             mimeType: 'video/VP8',
//             clockRate: 90000,
//             parameters: {
//               'x-google-start-bitrate': 1000
//             }
//           }
//         ] });
//       }
//       const router = routers[roomId];
//       console.log(router.rtpCapabilities)
//       callback({ rtpCapabilities: router.rtpCapabilities });
//     } catch (err) {
//       console.error('Error fetching router RTP capabilities:', err);
//       callback({ error: 'Failed to fetch RTP capabilities' });
//     }
//   });

//   socket.on('createSendTransport', async ({ roomId }, callback) => {
//     try {
//       const transport = await routers[roomId].createWebRtcTransport({
//         listenIps: [{ ip: '127.0.0.1', announcedIp: null }],
//         enableUdp: true,
//         enableTcp: true,
//         preferUdp: true
//       });

//       // Save the transport to the room
//       rooms[roomId]?.transports.push({ id: transport.id, transport });
//       console.log("entered in the create send transport")
//       callback({
//         id: transport.id,
//         iceParameters: transport.iceParameters,
//         iceCandidates: transport.iceCandidates,
//         dtlsParameters: transport.dtlsParameters
//       });
//     } catch (err) {
//       console.error('Error creating WebRTC transport:', err);
//       callback({ error: 'Failed to create transport' });
//     }
//   });

//   socket.on('produce', async ({ roomId, transportId, kind, rtpParameters }, callback) => {
//     try {
//         const transport = rooms[roomId].transports.find(t => t.id === transportId)?.transport;
//         if (!transport) {
//             return callback({ error: 'Transport not found' });
//         }

//         const producer = await transport.produce({ kind, rtpParameters });
//         rooms[roomId].producers.push({ 
//             id: producer.id, 
//             producer,
//             socketOwner: socket.id ,
//             kind: kind
//         });

//         signalingNamespace.to(roomId).emit('newProducer', { 
//             producerId: producer.id,
//             producerSocketId: socket.id
//         });
        
//         callback({ id: producer.id });
//     } catch (err) {
//         console.error('Error producing media:', err);
//         callback({ error: 'Failed to produce media' });
//     }
// });

//   socket.on('consume', async ({ roomId, producerId, rtpCapabilities }, callback) => {
//     try {
//       const router = routers[roomId];
//       if (!router.canConsume({ producerId, rtpCapabilities })) {
//         return callback({ error: 'Cannot consume this producer' });
//       }
  
//       const producer = rooms[roomId].producers.find(p => p.id === producerId)?.producer;
//       if (!producer) {
//         return callback({ error: 'Producer not found' });
//       }
  
//       // Create receive transport if it doesn't exist
//       let transport = rooms[roomId].transports.find(t => t.socketId === socket.id && t.direction === 'recv')?.transport;
//       if (!transport) {
//         transport = await router.createWebRtcTransport({
//           listenIps: [{ ip: '127.0.0.1', announcedIp: null }],
//           enableUdp: true,
//           enableTcp: true,
//           preferUdp: true
//         });
//         rooms[roomId].transports.push({ 
//           id: transport.id, 
//           transport,
//           socketId: socket.id,
//           direction: 'recv'
//         });
//       }
  
//       const consumer = await transport.consume({
//         producerId,
//         rtpCapabilities,
//         paused: false
//       });
  
//       callback({
//         id: consumer.id,
//         kind: consumer.kind,
//         rtpParameters: consumer.rtpParameters,
//         transportId: transport.id
//       });
//     } catch (err) {
//       console.error('Error consuming media:', err);
//       callback({ error: 'Failed to consume media' });
//     }
//   });
//   socket.on('disconnect', () => {
//     for (const roomId of Object.keys(rooms)) {
//       const room = rooms[roomId];
//       room.participants = room.participants.filter(p => p.id !== socket.id);
//       signalingNamespace.to(roomId).emit('participantLeft', { participantId: socket.id });
//     }
//   });

//   socket.on('error', (error) => {
//     console.error('SignalingNamespace Socket Error:', error.message);
//   });
// });



// // ------------------------- Redis Event Subscription -------------------------
// pubClient.on('ready', () => {
//   console.log('Connected to Redis');
// });

// pubClient.subscribe('galaeducation_database_reminders', () => {
//   console.log('Subscribed to Reminders channel');
// });

// pubClient.on('message', (channel, message) => {
//   console.log(`Message from ${channel}: ${message}`);

//   try {
//     // Parse the Redis message
//     const parsedMessage = JSON.parse(message);

//     // Check if the message is a reminder event
//     if (channel === 'galaeducation_database_reminders' && parsedMessage.event === 'reminders.event') {
//       const { reminder, topic } = parsedMessage.data;

//       if (!reminder || !topic) {
//         console.error('Invalid reminder data or topic ID');
//         return;
//       }

//       // Emit the reminder to users in the topic
//       appNamespace.to(topic).emit('newReminder', reminder);
//       console.log(`Emitted newReminder to topic ${topic}:`, reminder);
//     }
//   } catch (error) {
//     console.error('Error processing Redis message:', error.message);
//   }
// });

// // ------------------------- Health Check Endpoint -------------------------
// app.get('/health', (req, res) => {
//   res.status(200).send({ status: 'OK', message: 'Server is running!' });
// });

// // ------------------------- Start Server -------------------------
// const PORT = process.env.PORT || 3001;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { default: axios } = require('axios');
const mediasoup = require('mediasoup');

dotenv.config();

const app = express();
const server = http.createServer(app);

const pubClient = createClient({ host: '127.0.0.1', port: 6379 });
const subClient = pubClient.duplicate();

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.adapter(createAdapter(pubClient, subClient));

const publicKey = process.env.PASSPORT_PUBLIC_KEY;

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

const signalingNamespace = io.of('/signaling').use(authenticateSocket);

// Store rooms, workers, and routers
const rooms = new Map();
const workers = new Map();
const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000
    }
  }
];

// Initialize worker
async function createWorker() {
  const worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });
  
  worker.on('died', () => {
    console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
    setTimeout(() => process.exit(1), 2000);
  });
  
  return worker;
}

signalingNamespace.on('connection', async (socket) => {
  console.log(`SignalingNamespace: User connected: ${socket.id}`);
  
  let worker;
  try {
    worker = await createWorker();
    workers.set(socket.id, worker);
  } catch (error) {
    console.error('Failed to create worker:', error);
    socket.disconnect();
    return;
  }

  socket.on('joinRoom', async ({ roomId }, callback) => {
    try {
      let room = rooms.get(roomId);
      
      if (!room) {
        const router = await worker.createRouter({ mediaCodecs });
        room = {
          router,
          participants: new Map(),
          producers: new Map(),
          consumers: new Map(),
          transports: new Map()
        };
        rooms.set(roomId, room);
      }

      room.participants.set(socket.id, {
        id: socket.id,
        user: socket.user,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map()
      });

      // Join the room
      socket.join(roomId);
      socket.roomId = roomId;

      // Notify others
      socket.to(roomId).emit('participantJoined', {
        participant: { id: socket.id, user: socket.user }
      });

      // Send existing producers to the new participant
      const producers = Array.from(room.producers.values()).map(producer => ({
        producerId: producer.id,
        producerSocketId: producer.socketId
      }));

      callback({
        roomInfo: {
          id: roomId,
          participantCount: room.participants.size
        },
        participants: Array.from(room.participants.values()).map(p => ({
          id: p.id,
          user: p.user
        })),
        producers
      });
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ error: error.message });
    }
  });

  socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }
      callback({ rtpCapabilities: room.router.rtpCapabilities });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('createSendTransport', async ({ roomId }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const transport = await room.router.createWebRtcTransport({
        listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000
      });

      room.participants.get(socket.id).transports.set(transport.id, {
        transport,
        type: 'send'
      });

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('createRecvTransport', async ({ roomId }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const transport = await room.router.createWebRtcTransport({
        listenIps: [{ ip: '0.0.0.0', announcedIp: '192.168.100.105' }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      });

      room.participants.get(socket.id).transports.set(transport.id, {
        transport,
        type: 'receive'
      });

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('connectTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(socket.id);
      const transport = participant.transports.get(transportId);
      
      if (!transport) {
        throw new Error('Transport not found');
      }

      await transport.transport.connect({ dtlsParameters });
      callback({ success: true });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('produce', async ({ roomId, transportId, kind, rtpParameters }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(socket.id);
      const transport = participant.transports.get(transportId);
      
      if (!transport || transport.type !== 'send') {
        throw new Error('Send transport not found');
      }

      const producer = await transport.transport.produce({
        kind,
        rtpParameters
      });

      participant.producers.set(producer.id, producer);
      room.producers.set(producer.id, {
        id: producer.id,
        socketId: socket.id,
        kind
      });

      // Notify other participants about the new producer
      socket.to(roomId).emit('newProducer', {
        producerId: producer.id,
        producerSocketId: socket.id
      });

      callback({ id: producer.id });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('consume', async ({ roomId, producerId, rtpCapabilities }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      const participant = room.participants.get(socket.id);
      const producer = room.producers.get(producerId);
      
      if (!producer) {
        throw new Error('Producer not found');
      }

      if (!room.router.canConsume({
        producerId: producerId,
        rtpCapabilities,
      })) {
        throw new Error('Cannot consume this producer');
      }

      // Find or create receive transport
      let transport;
      for (const [, t] of participant.transports) {
        if (t.type === 'receive') {
          transport = t;
          break;
        }
      }

      if (!transport) {
        throw new Error('Receive transport not found');
      }

      const consumer = await transport.transport.consume({
        producerId,
        rtpCapabilities,
        paused: false
      });

      participant.consumers.set(consumer.id, consumer);

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const roomId = socket.roomId;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        // Clean up participant's resources
        const participant = room.participants.get(socket.id);
        if (participant) {
          // Close all transports
          participant.transports.forEach(t => t.transport.close());
          
          // Remove producers
          participant.producers.forEach(producer => {
            room.producers.delete(producer.id);
            producer.close();
          });
          
          // Close consumers
          participant.consumers.forEach(consumer => consumer.close());
          
          // Remove participant from room
          room.participants.delete(socket.id);
        }

        // Notify others about participant leaving
        socket.to(roomId).emit('participantLeft', { participantId: socket.id });

        // Clean up room if empty
        if (room.participants.size === 0) {
          room.router.close();
          rooms.delete(roomId);
        }
      }
    }

    // Clean up worker
    const worker = workers.get(socket.id);
    if (worker) {
      worker.close();
      workers.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});