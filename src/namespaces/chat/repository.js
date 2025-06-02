import { emitSocketError } from "../../utils/socket-error.js";
import pinnoLogger from "../../utils/pinno-logger.js";
import { getParticipantsApi } from "./helpers.js";
import { addParticipant, getParticipants } from "./redis.js";

export const getParticipantsWithFallback = async ({
  chatId,
  redisOps,
  context,
  socket,
}) => {
  let participants = await getParticipants(chatId, redisOps);

  if (participants.length < 2) {
    pinnoLogger.info("Redis has no participants, falling back to API...");

    const apiParticipants = await getParticipantsApi(chatId, context);
    pinnoLogger.debug({ msg: "Charts", chats: apiParticipants });
    participants = apiParticipants.map((p) => p.user_id).filter(Boolean);

    if (participants.length > 0) {
      await addParticipant(chatId, participants, redisOps);
    }
  }

  if (participants.length < 2) {
    emitSocketError(
      socket,
      {
        message: "Not enough participants found",
        details: `Chat ID: ${chatId}`,
      },
      true
    );
    return null;
  }

  return participants;
};
