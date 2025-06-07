import { makeAuthenticatedRequest } from "../../services/api.js";
import pinnoLogger from "../../utils/pinno-logger.js";

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

export const getParticipantsApi = async (chatId, context) => {
  try {
    const client = makeAuthenticatedRequest(context.token, context.isDev);
    const result = await client.get(`/chat/${chatId}/participants`);

    if (
      result?.data?.status === "success" &&
      Array.isArray(result?.data?.data)
    ) {
      pinnoLogger.info({ result: result.data.data, msg: "THIS IS THE RESULT INSIDE" });
      return result.data.data;
    }


    throw new Error("Invalid response format");
  } catch (err) {
    pinnoLogger.error("Failed to fetch participants from API:", err.message);
    return [];
  }
};
