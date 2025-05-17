import { makeAuthenticatedRequest } from "../../services/api.js";
import { logger } from "../../utils/logger.js";

const prepareMessageStatusUpdatePayload = (messages, user_id, status) => ({
  message_ids: messages.map((m) => m.message_id),
  user_id: user_id,
  status: status,
});

export const updateMessageStatus = async (
  messages,
  user_id,
  status,
  context
) => {
  try {
    const payload = prepareMessageStatusUpdatePayload(
      messages,
      user_id,
      status
    );
    const client = makeAuthenticatedRequest(context.token, context.isDev);
    const data = await client.post("/message/status", payload);
    return data;
  } catch (error) {
    console.error(
      `Failed to update message status to "${status}":`,
      error.response?.data || error.message
    );
    return null;
  }
};

export const updateUnreadCounts = async (unreadCounts, chatId, context) => {
  logger.debug(`Participants on unread ${unreadCounts}`)
  try {
    const client = makeAuthenticatedRequest(context.token, context.isDev);
    const result = await client.put(`/chat/${chatId}/unread-counts`, {
      participants: unreadCounts,
    });
    return result.data;
  } catch (error) {
    console.error("Failed to update unread counts:", error);
    return null;
  }
};

export const unreadCount = async (data, chat_id, context) => {
  const client = makeAuthenticatedRequest(context.token, context.isDev);
  return await client.put(`chat/${chat_id}/unread-counts`, {
    participants: data,
  });
};

export const updateUserStatus = async (data, context) => {
  const client = makeAuthenticatedRequest(context.token, context.isDev);
  return await client.post("/user-status", data);
};
