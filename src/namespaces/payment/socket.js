import { EVENTS } from "../../config/socket/events.js";
import { handleJoin } from "./handlers.js";

export const paymentSocket = (n, _r) => {
  n.on(EVENTS.CONNECT, (s) => {
    s.on(EVENTS.JOIN, (data) => handleJoin(s, data));
  });
};
