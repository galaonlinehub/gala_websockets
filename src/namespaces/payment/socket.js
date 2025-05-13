import { handleEmailJoin } from "./handlers.js";

export const paymentSocket = (n, _r) => {
  n.on("connection", (s) => {
    s.on("join", (data) => handleEmailJoin(s, data));
  });
};
