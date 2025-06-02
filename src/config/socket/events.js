export const EVENTS = {
  // General events
  CONNECT: "connection",
  DISCONNECT: "disconnect",
  ERROR: "error",
  JOIN: "join",
  LEAVE: "leave",
  RECONNECT: "reconnect",

  // Chat events
  CHAT_MESSAGE_SEND: "send_message",
  CHAT_MESSAGE_READ: "message_read",
  CHAT_NEW_MESSAGE: "new_message",
  CHAT_MESSAGE_EDIT: "message_edit",
  CHAT_MESSAGE_STATUS: "message_status",
  CHAT_MESSAGE_STATUS_BATCH: "message_status_batch",
  CHAT_JOIN: "join_chat",
  CHAT_SIDEBAR_NEW_MESSAGE: "sidebar_new_message",
  CHAT_SIDEBAR_UNREAD_RESET: "sidebar_unread_reset",
  CHAT_SIDEBAR_STOP_TYPING: "sidebar_stop_typing",
  CHAT_SIDEBAR_TYPING: "sidebar_typing",
  CHAT_MESSAGE_ID_UPDATE: "message_id_updated",

  // User events
  USER_TYPING: "user_typing",
  USER_STOP_TYPING: "user_stop_typing",
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  USER_LEFT: "user_left",
  USER_STATUS_UPDATE: "user_status_update",
  USER_JOINED: "user_joined",

  // Notification events
  NOTIFICATION_NEW: "notification_new",
  NOTIFICATION_READ: "notification_read",

  // Room events
  ROOM_CREATED: "room_created",
  ROOM_DELETED: "room_deleted",
  ROOM_UPDATED: "room_updated",

  // File upload events
  FILE_UPLOAD_START: "file_upload_start",
  FILE_UPLOAD_PROGRESS: "file_upload_progress",
  FILE_UPLOAD_COMPLETE: "file_upload_complete",

  SOCIAL: "social",
};
