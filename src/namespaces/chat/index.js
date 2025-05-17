import { authenticateNamespace } from "../../middleware/auth.js";
import { chatSocket } from "./socket.js";

export function setupChatNamespace(io, redisClient) {
  const chatNamespace = authenticateNamespace(io.of("/chat"));

  chatSocket(chatNamespace, redisClient);

  return chatNamespace;
}
