export const getChatMessages = async (chatId, limit, client) => {
  return client.lRange(`chat:${chatId}:messages`, -limit, -1);
};

export const storeMessage = async (chatId, message, client) => {
  const messageKey = `chat:${chatId}:messages`;
  return (await client.rPush(messageKey, JSON.stringify(message))) - 1;
};

export const getParticipants = async (chatId, client) => {
  const raw = await client.lRange(`chat:${chatId}:participants`, 0, -1);

  return raw
    .flatMap((p) => p.split(","))
    .map((p) => parseInt(p.trim(), 10))
    .filter((n) => !isNaN(n));
};

export const addParticipant = async (chatId, userOrUsers, client) => {
  const values = Array.isArray(userOrUsers)
    ? userOrUsers.map(String)
    : [String(userOrUsers)];
   console.log(values)
   console.log(...values)
  return client.rPush(`chat:${chatId}:participants`, [['9', '2', '100']]);
};

export const markMessageDelivered = async (
  chatId,
  userId,
  messageId,
  client
) => {
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
