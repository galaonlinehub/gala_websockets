import { EVENTS } from "../../config/socket/events.js";
import { handleEmailJoin } from "./handlers.js";

export const paymentSocket = (n, _r) => {
  n.on(EVENTS.CONNECT, (s) => {
    s.on(EVENTS.JOIN, (data) => handleEmailJoin(s, data));
  });
};
