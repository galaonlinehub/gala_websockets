import { put, post } from "../../services/api.js";

const prepareMessageStatusUpdatePayload = (messages, user_id, status) => ({
  message_ids: messages.map((m) => m.message_id),
  user_id: user_id,
  status: status,
});

export const updateMessageStatus = async (messages, user_id, status) => {
  try {
    const payload = prepareMessageStatusUpdatePayload(
      messages,
      user_id,
      status
    );
    const data = await post("/message/status", payload);
    return data;
  } catch (error) {
    console.error(
      `Failed to update message status to "${status}":`,
      error.response?.data || error.message
    );
    return null;
  }
};

export const updateUnreadCounts = async (unreadCounts, chatId, token) => {
  try {
    const result = await put(
      `/chat/${chatId}/unread-counts`,
      { participants: unreadCounts },
      token
    );
    return result.data;
  } catch (error) {
    console.error("Failed to update unread counts:", error);
    return null;
  }
};

export const unreadCount = async (data, chat_id) =>
  await put(`chat/${chat_id}/unread-counts`, { participants: data });

export const updateUserStatus = async (data) =>
  await post("/user-status", data);
