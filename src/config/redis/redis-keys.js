export const RedisKeys = {
  participants: (chatId) => `chat:${chatId}:participants`,
  messages: (chatId) => `chat:${chatId}:messages`,
  messagesList: (chatId) => `chat:${chatId}:messages:list`,
  delivered: (chatId, userId) => `delivered:${chatId}:${userId}`,
  unread: (userId, chatId) => `unread:${userId}:${chatId}`,
  read: (chatId, userId) => `read:${chatId}:${userId}`,

  typing: (chatId) => `typing:${chatId}`,
  stopTyping: (chatId) => `stop_typing:${chatId}`,
  activeUsers: (chatId) => `active:${chatId}`,
  
  userStatus: (userId) => `user_status:${userId}`,
  userSessions: (userId) => `user:${userId}:sessions`,
  onlineUsers: () => `users:online`,
  

  chatStatus: (chatId) => `chat_status:${chatId}`,
  chatMembers: (chatId) => `chat:${chatId}:members`,
  userChats: (userId) => `user:${userId}:chats`,

  notificationQueue: (userId) => `notifications:${userId}`,
  emailQueue: () => `queue:email`,
};

export const getKeyType = (fullKey) => {
  const patterns = [
    { pattern: /^chat:\w+:participants$/, type: "participants" },
    { pattern: /^chat:\w+:messages$/, type: "messages" },
    { pattern: /^chat:\w+:messages:list$/, type: "messagesList" },
    { pattern: /^delivered:\w+:\w+$/, type: "delivered" },
    { pattern: /^unread:\w+:\w+$/, type: "unread" },
    { pattern: /^read:\w+:\w+$/, type: "read" },
    { pattern: /^typing:\w+$/, type: "typing" },
    { pattern: /^stop_typing:\w+$/, type: "stopTyping" },
    { pattern: /^active:\w+$/, type: "activeUsers" },
    { pattern: /^user_status:\w+$/, type: "userStatus" },
    { pattern: /^user:\w+:sessions$/, type: "userSessions" },
    { pattern: /^users:online$/, type: "onlineUsers" },
    { pattern: /^chat_status:\w+$/, type: "chatStatus" },
    { pattern: /^chat:\w+:members$/, type: "chatMembers" },
    { pattern: /^user:\w+:chats$/, type: "userChats" },
    { pattern: /^notifications:\w+$/, type: "notificationQueue" },
    { pattern: /^queue:email$/, type: "emailQueue" },
  ];

  for (const { pattern, type } of patterns) {
    if (pattern.test(fullKey)) {
      return type;
    }
  }
  return null;
};
