
export const getChatMessages = async (chatId, limit, client) => {
    return client.lRange(`chat:${chatId}:messages`, -limit, -1);
  };
  
  export const storeMessage = async (chatId, message, client) => {
    const messageKey = `chat:${chatId}:messages`;
    return (await client.rPush(messageKey, JSON.stringify(message))) - 1; 
  };
  
  export const getParticipants = async (chatId, client) => {
    return client.lRange(`chat:${chatId}:participants`, 0, -1);
  };
  
  export const addParticipant = async (chatId, userId, client) => {
    return client.rPush(`chat:${chatId}:participants`, userId);
  };
  
  export const markMessageDelivered = async (chatId, userId, messageId, client) => {
    const deliveredKey = `delivered:${chatId}:${userId}`;
    return client.sAdd(deliveredKey, String(messageId));
  };
  
  export const incrementUnreadCount = async (userId, chatId, client) => {
    const unreadKey = `unread:${userId}:${chatId}`;
    await client.incr(unreadKey);
    return client.get(unreadKey); 
  };
  
  export const resetUnreadCount = async (userId, chatId, client) => {
    const unreadKey = `unread:${userId}:${chatId}`;
    await client.set(unreadKey, 0);
    return 0;
  };
  
  export const markMessageRead = async (chatId, userId, messageIds, client) => {
    const readKey = `read:${chatId}:${userId}`;
    return client.sAdd(readKey, messageIds.map(String));
  };
  

  
  