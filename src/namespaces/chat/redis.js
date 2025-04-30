
export const getChatMessages = async (chatId, limit, client) => {
    return client.lrange(`chat:${chatId}:messages`, -limit, -1);
  };
  
  export const storeMessage = async (chatId, message, client) => {
    const messageKey = `chat:${chatId}:messages`;
    return (await client.rpush(messageKey, JSON.stringify(message))) - 1; 
  };
  
  export const getParticipants = async (chatId, client) => {
    return client.lrange(`chat:${chatId}:participants`, 0, -1);
  };
  
  export const addParticipant = async (chatId, userId, client) => {
    return client.rpush(`chat:${chatId}:participants`, userId);
  };
  
  export const markMessageDelivered = async (chatId, userId, messageId, client) => {
    const deliveredKey = `delivered:${chatId}:${userId}`;
    return client.sadd(deliveredKey, String(messageId));
  };
  
  export const incrementUnreadCount = async (userId, chatId, client) => {
    const unreadKey = `unread:${userId}:${chatId}`;
    await client.incr(unreadKey);
    return client.get(unreadKey); // Return the new unread count
  };
  
  export const resetUnreadCount = async (userId, chatId, client) => {
    const unreadKey = `unread:${userId}:${chatId}`;
    await client.set(unreadKey, 0);
    return 0;
  };
  
  export const markMessageRead = async (chatId, userId, messageIds, client) => {
    const readKey = `read:${chatId}:${userId}`;
    return client.sadd(readKey, messageIds.map(String));
  };
  

  
  