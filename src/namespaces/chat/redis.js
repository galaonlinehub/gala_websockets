import { config } from "../../config/index.js";

export const storeMessage = async (chatId, message, ops) => {
  const key = config.redis.keys.messages(chatId);
  const newLength = await ops.pushToListRight(key, JSON.stringify(message));
  if (newLength === 0) {
    throw new Error("Failed to store message in Redis");
  }
  return newLength - 1;
};

export const updateMessageId = async (chat_id, messageIndex, message, ops) => {
  const key = config.redis.keys.messages(chat_id);
  return ops.setListItem(key, messageIndex, JSON.stringify(message));
};

export const getParticipants = async (chatId, ops) => {
  const key = config.redis.keys.participants(chatId);
  const raw = await ops.getListRange(key);
  return raw
    .flatMap((p) => p.split(","))
    .map((p) => parseInt(p.trim(), 10))
    .filter((n) => !isNaN(n));
};

export const addParticipant = async (chatId, userOrUsers, ops) => {
  const values = Array.isArray(userOrUsers)
    ? userOrUsers.map(String)
    : [String(userOrUsers)];

  const key = config.redis.keys.participants(chatId);
  return ops.pushToListRight(key, values);
};

export const markMessageDelivered = async (chatId, userId, messageId, ops) => {
  const key = config.redis.keys.delivered(chatId, userId);
  return ops.addToSet(key, String(messageId));
};

export const incrementUnreadCount = async (userId, chatId, ops) => {
  const key = config.redis.keys.unread(userId, chatId);
  await ops.incrementWithTTL(key);
  return ops.getString(key);
};

export const resetUnreadCount = async (userId, chatId, ops) => {
  const key = config.redis.keys.unread(userId, chatId);
  await ops.setString(key, 0);
  return 0;
};

export const markMessageRead = async (chatId, userId, messageIds, ops) => {
  const key = config.redis.keys.read(chatId, userId);
  return await ops.addToSet(key, messageIds.map(String));
};
