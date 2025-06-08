import pinnoLogger from "../../utils/pinno-logger.js";

export const handleJoin = (s, { id }) => {
  if (id) {
    s.join(id);
  } else {
    pinnoLogger.warn("No email provided in join event.");
  }
};
