import mediasoup from 'mediasoup';
import axios from 'axios';
import { getIPv4Address } from '../config.js';

export default function setupSignalingNamespace(io, worker, authenticateSocket) {
  let rooms = {};
  let peers = {};
  let transports = [];
  let producers = [];
  let consumers = [];

  const removeItems = (items, socketId, type) => {
    items.forEach(item => {
      if (item.socketId === socketId) {
        item[type].close();
      }
    });
    return items.filter(item => item.socketId !== socketId);
  };

  const createWebRtcTransport = async (router) => {
    return new Promise(async (resolve, reject) => {
      try {
        const transport = await router.createWebRtcTransport({
          listenIps: [
            {
              ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
              announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || getIPv4Address(),
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

  const createRoom = async (roomName, socketId) => {
    let router;
    let peers = [];

    if (rooms[roomName]) {
      router = rooms[roomName].router;
      peers = rooms[roomName].peers;
    } else {
      router = await worker.createRouter({ mediaCodecs });
    }
    
    rooms[roomName] = {
      router,
      peers: [...peers, socketId],
    };

    return router;
  };

  const checkUserConstraints = (roomName, user) => {
    const existingPeer = Object.values(peers).find(peer => 
      peer.user.id === user.id
    );
    
    if (existingPeer) {
      throw new Error('User already has an active connection in a room');
    }

    if (user.role === 'instructor') {
      const existingInstructor = Object.values(peers).find(peer => 
        peer.roomName === roomName && 
        peer.user.role === 'instructor'
      );
      
      if (existingInstructor) {
        throw new Error('Room already has an instructor');
      }
    }

    return true;
  };

  const signalingNamespace = io.of('/signaling').use(authenticateSocket);

  signalingNamespace.on('connection', async socket => {
    console.log('User connected:', socket.id, socket.user);
    
    socket.emit('connection-success', {
      socketId: socket.id,
      role:socket.user.role,
      name:socket.user.first_name + " " + socket.user.last_name
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
  
    const checkUserConstraints = (roomName, user) => {
      
      const existingPeer = Object.values(peers).find(peer => 
        peer.user.id === user.id
      );
      
      if (existingPeer) {
        throw new Error('User already has an active connection in a room');
      }
  
      
      if (user.role === 'instructor') {
        const existingInstructor = Object.values(peers).find(peer => 
          peer.roomName === roomName && 
          peer.user.role === 'instructor'
        );
        
        if (existingInstructor) {
          throw new Error('Room already has an instructor');
        }
      }
  
      return true;
    };
  
  
    socket.on('joinRoom', async ({ roomName }, callback) => {
      try {
  
        const token = socket.handshake.query.token;
        const res = await axios.get(`https://galaweb.galahub.org/api/verify_meeting/${roomName}`,{
          headers:{
            Authorization: `Bearer ${token}`,
          }
        });
        if (res.status === 404){
          throw new Error('Invalid meeting link encountered')
          
        }
        if(res.data){
          if(res.status === 200 && res.data === "Ok"){
  
          checkUserConstraints(roomName, socket.user);
  
         
        socket.join(roomName);
        const router = await createRoom(roomName, socket.id);
        
  
        peers[socket.id] = {
          socket,
          roomName,
          transports: [],
          producers: [],
          consumers: [],
          user: socket.user 
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
    
        // Sending both capabilities and existing producers
        callback({ 
          rtpCapabilities,
          existingProducers  
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
        console.log("The error is",error);
        console.error('Error joining room:', error?.response?.data || error);
      
        callback({ error: error?.response?.data });
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
  
        peers[socket.id].producers.push(producer);
  
        const peerDetails = peers[socket.id].peerDetails;
  
        // Notify other peers in the room
        socket.broadcast.to(roomName).emit('new-producer', {
          producerId: producer.id,
          socketId: socket.id,
          peerDetails: {
            name: socket.user.first_name + " " + socket.user.first_name,
            isInstructor: socket.user.role === "instructor",
            role: socket.user.role,
            
          }
          
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
  
      
      // Find the producer's socket information using the remoteProducerId
      const producerData = consumers.find(c => c.consumer.id === remoteProducerId) || 
                          [...Object.entries(peers)].find(([socketId, peer]) => 
                            peer.producers.some(p => p.id === remoteProducerId)
                          );
  
      if (!producerData) {
        console.error('Producer data not found');
        throw new Error('Producer data not found');
      }
  
      const producerSocketId = producerData[0]; 
      const producerUserInfo = peers[producerSocketId].user;
  
  
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
            user: {
              id: producerUserInfo.id,
              role: producerUserInfo.role,
              name: producerUserInfo.first_name + " " + producerUserInfo.last_name
            }
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
  
    socket.on("message",async({roomId,message,userName,senderId})=>{
     try{
       console.log("message received "+roomId,message)
       socket.broadcast.to(roomId).emit("message",{message,userName,senderId})
  
     }catch(error){
       console.log(error)}
     
    })
  
  
    socket.on('tldraw-event', (data) => {
      console.log("event triggered",{...data})
      socket.to(data.roomId).emit('tldraw-event', data);
    });
  
  
  });

  return signalingNamespace;
}

