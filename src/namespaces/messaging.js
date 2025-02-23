
import axios from 'axios';

export default function setupMessagingNamespace(io, redisClient) {
  
  const messagingNamespace = io.of('/chat');
  const onlineUsers = new Map();

  messagingNamespace.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    socket.on('join', async ({userId}) => {
      console.log("user joined", userId);
      onlineUsers.set(userId, socket.id);
      redisClient.set(`user:${userId}:status`, 'online');
      socket.userId = userId;

      const queuedMessages = await redisClient.lRange(`queued:${userId}`, 0, -1);
      if (queuedMessages.length > 0) {
        console.log(`Delivering queued messages to user ${userId}`);
        queuedMessages.forEach(msg => {
          const message = JSON.parse(msg);
          socket.emit('queued-message', message);
        });
        await redisClient.del(`queued:${userId}`);
      }

      socket.broadcast.emit('user-status', { userId, status: 'online' });
    });

    socket.on('message', async ({ senderId, receiverId, message }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      
      if (receiverSocketId) {
        messagingNamespace.to(receiverSocketId).emit('message', { senderId, message });
      } else {
        const messageQueueKey = `queued:${receiverId}`;
        redisClient.rPush(messageQueueKey, JSON.stringify({ senderId, message }));
        console.log(`Message queued for user ${receiverId}`);
      }

      try {
        const res = await axios.post('https://galaweb.galahub.org/api/save-message', {
          sender_id: senderId,
          receiver_id: receiverId,
          message,
        });
        console.log('Message saved:', res.data);
      } catch (error) {
        console.error('Failed to save message:', error.message);
      }
    });

    socket.on('disconnect', () => {
      const userId = [...onlineUsers.entries()].find(([, id]) => id === socket.id)?.[0];
      if (userId) {
        onlineUsers.delete(userId);
        redisClient.set(`user:${userId}:status`, 'offline');
        console.log(`User ${userId} went offline`);
        socket.broadcast.emit('user-status', { userId, status: 'offline' });
      }
    });
  });

  return messagingNamespace;
}
