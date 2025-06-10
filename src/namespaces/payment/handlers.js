import pinnoLogger from "../../utils/pinno-logger.js";

export const handleJoin = (s, { id }) => {
  if (id) {
    console.log("User joined",id);
    s.join(id);
  } else {
    pinnoLogger.warn("No id provided in join event.");
  }
};
