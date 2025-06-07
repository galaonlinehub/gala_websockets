import { getKeyType } from "./redis-keys.js";

export const RedisTTLs = {
  // Chat data (longer retention)
  participants: 60 * 60 * 24 * 7,    // 7 days
  messages: 60 * 60 * 24 * 3,        // 3 days
  messagesList: 60 * 60 * 24 * 3,    // 3 days
  delivered: 60 * 60 * 24,           // 1 day
  unread: 60 * 60 * 24 * 7,          // 7 days
  read: 60 * 60 * 24,                // 1 day
  
  // Real-time features (short-lived)
  typing: 30,                        // 30 seconds
  stopTyping: 30,                    // 30 seconds
  activeUsers: 60 * 5,               // 5 minutes
  
  // User status
  userStatus: 60 * 15,               // 15 minutes
  userSessions: 60 * 60 * 24,        // 1 day
  onlineUsers: 60 * 5,               // 5 minutes
  
  // Chat management
  chatStatus: 60 * 60 * 2,           // 2 hours
  chatMembers: 60 * 60 * 24,         // 1 day
  userChats: 60 * 60 * 12,           // 12 hours
  
  // Queues
  notificationQueue: 60 * 60 * 24,   // 1 day
  emailQueue: 60 * 60 * 2,           // 2 hours
};

export const getRedisTTL = (keyOrType) => {
  if (RedisTTLs[keyOrType]) {
    return RedisTTLs[keyOrType];
  }
  
  const keyType = getKeyType(keyOrType);
  return keyType ? RedisTTLs[keyType] : null;
};

export const setRedisTTL = async (client, key, customTTL = null) => {
  const ttl = customTTL || getRedisTTL(key);
  if (ttl !== null && ttl > 0) {
    await client.expire(key, ttl);
    return ttl;
  }
  return null;
};