import { handleEmailJoin } from "./handlers.js";

export const paymentSocket = (n, r) => {
  n.on("connection", (s) => {
    s.on("join", handleEmailJoin(s, obj));
  });
};
