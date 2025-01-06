import mediasoup from 'mediasoup';
import { Server } from 'socket.io';
import { createWorker } from './worker';
import { mediaCodecs, transportOptions } from './config.js';

export class MediaServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'https://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.worker = null;
    this.rooms = new Map();
    this.peers = new Map();

    this.initialize();
  }

  async initialize() {
    this.worker = await createWorker();
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    const signaling = this.io.of('/signaling');
    
    signaling.use(this.authenticateSocket);
    
    signaling.on('connection', (socket) => {
      console.log('New connection:', socket.id);
      
      this.handleConnection(socket);
      
      socket.on('disconnect', () => this.handleDisconnect(socket));
      socket.on('joinRoom', (data, callback) => this.handleJoinRoom(socket, data, callback));
      socket.on('createWebRtcTransport', (data, callback) =>
        this.handleCreateWebRtcTransport(socket, data, callback));
      socket.on('transport-connect', (data) => this.handleTransportConnect(socket, data));
      socket.on('transport-produce', (data, callback) => this.handleTransportProduce(socket, data, callback));
      socket.on('transport-recv-connect', (data) => this.handleRecvTransportConnect(socket, data));
      socket.on('consume', (data, callback) => this.handleConsume(socket, data, callback));
      socket.on('consumer-resume', (data) => this.handleConsumerResume(socket, data));
      socket.on('getProducers', (callback) => this.handleGetProducers(socket, callback));
    });
  }

  async handleJoinRoom(socket, { roomName }, callback) {
    try {
      const router = await this.getOrCreateRouter(roomName);
      
      // Store peer information
      this.peers.set(socket.id, {
        socket,
        roomName,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
        rtpCapabilities: null
      });

      // Join the room
      socket.join(roomName);

      // Get existing producers in room
      const existingProducers = Array.from(this.getProducersInRoom(roomName)).map(producer => ({
        id: producer.id,
        kind: producer.kind,
        socketId: producer.appData.socketId,
        isInstructor: producer.appData.isInstructor
      }));

      callback({
        rtpCapabilities: router.rtpCapabilities,
        existingProducers
      });

    } catch (error) {
      console.error('Error joining room:', error);
      callback({ error: error.message });
    }
  }

  async handleCreateWebRtcTransport(socket, { consumer }, callback) {
    try {
      const peer = this.peers.get(socket.id);
      const router = await this.getRouterForPeer(peer);
      
      const transport = await router.createWebRtcTransport({
        ...transportOptions,
        appData: { socketId: socket.id }
      });

      // Store transport
      peer.transports.set(transport.id, {
        transport,
        consumer: !!consumer
      });

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
  }

  async handleTransportConnect(socket, { dtlsParameters, transportId }) {
    try {
      const peer = this.peers.get(socket.id);
      const transportData = peer.transports.get(transportId);
      
      if (!transportData) {
        throw new Error('Transport not found');
      }

      await transportData.transport.connect({ dtlsParameters });

    } catch (error) {
      console.error('Error connecting transport:', error);
    }
  }

  async handleTransportProduce(socket, { kind, rtpParameters, appData, transportId }, callback) {
    try {
      const peer = this.peers.get(socket.id);
      const transportData = peer.transports.get(transportId);
      
      if (!transportData) {
        throw new Error('Transport not found');
      }

      const producer = await transportData.transport.produce({
        kind,
        rtpParameters,
        appData: {
          ...appData,
          socketId: socket.id,
          isInstructor: socket.user.role === 'instructor'
        }
      });

      // Store producer
      peer.producers.set(producer.id, producer);

      // Notify other peers in the room
      socket.to(peer.roomName).emit('new-producer', {
        producerId: producer.id,
        socketId: socket.id,
        kind: producer.kind,
        isInstructor: socket.user.role === 'instructor',
        userData: {
          name: socket.user.first_name + " " + socket.user.last_name,
          role: socket.user.role
        }
      });

      callback({ id: producer.id });

    } catch (error) {
      console.error('Error in transport-produce:', error);
      callback({ error: error.message });
    }
  }

  async handleConsume(socket, { rtpCapabilities, remoteProducerId, transportId }, callback) {
    try {
      const peer = this.peers.get(socket.id);
      const router = await this.getRouterForPeer(peer);
      const transportData = peer.transports.get(transportId);

      if (!router.canConsume({
        producerId: remoteProducerId,
        rtpCapabilities,
      })) {
        throw new Error('Cannot consume this producer');
      }

      const consumer = await transportData.transport.consume({
        producerId: remoteProducerId,
        rtpCapabilities,
        paused: true,
        appData: { socketId: socket.id }
      });

      // Store consumer
      peer.consumers.set(consumer.id, consumer);

      consumer.on('producerclose', () => {
        consumer.close();
        peer.consumers.delete(consumer.id);
        socket.emit('producer-closed', { remoteProducerId });
      });

      callback({
        params: {
          id: consumer.id,
          producerId: remoteProducerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        }
      });

    } catch (error) {
      console.error('Error in consume:', error);
      callback({ error: error.message });
    }
  }

  async handleConsumerResume(socket, { consumerId }) {
    try {
      const peer = this.peers.get(socket.id);
      const consumer = peer.consumers.get(consumerId);
      
      if (consumer) {
        await consumer.resume();
      }
    } catch (error) {
      console.error('Error resuming consumer:', error);
    }
  }

  handleGetProducers(socket, callback) {
    try {
      const peer = this.peers.get(socket.id);
      const producers = this.getProducersInRoom(peer.roomName);
      
      callback(Array.from(producers).map(producer => ({
        id: producer.id,
        kind: producer.kind,
        socketId: producer.appData.socketId,
        isInstructor: producer.appData.isInstructor
      })));

    } catch (error) {
      console.error('Error getting producers:', error);
      callback({ error: error.message });
    }
  }

  handleDisconnect(socket) {
    try {
      const peer = this.peers.get(socket.id);
      if (peer) {
        // Close all transports
        for (const [_, transportData] of peer.transports) {
          transportData.transport.close();
        }

        // Remove peer from room
        this.peers.delete(socket.id);

        // Notify others in the room
        socket.to(peer.roomName).emit('peer-left', {
          socketId: socket.id
        });

        // Clean up room if empty
        if (this.getRoomPeers(peer.roomName).length === 0) {
          this.rooms.delete(peer.roomName);
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  // Helper methods
  async getOrCreateRouter(roomName) {
    let router = this.rooms.get(roomName);
    if (!router) {
      router = await this.worker.createRouter({ mediaCodecs });
      this.rooms.set(roomName, router);
    }
    return router;
  }

  async getRouterForPeer(peer) {
    return this.rooms.get(peer.roomName);
  }

  getProducersInRoom(roomName) {
    const producers = new Set();
    for (const peer of this.peers.values()) {
      if (peer.roomName === roomName) {
        for (const producer of peer.producers.values()) {
          producers.add(producer);
        }
      }
    }
    return producers;
  }

  getRoomPeers(roomName) {
    return Array.from(this.peers.values()).filter(peer => peer.roomName === roomName);
  }
}

export default MediaServer;