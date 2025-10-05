import { logger } from "./logger";

export const authContext = (s) => ({ token: s.token, isDev: s.isDev });

export function extractAuthMetadata(socket) {
  logger("Extracting auth metadata");
  const { handshake } = socket;
  const { auth = {}, headers = {}, query = {} } = handshake;

  logger("Handshake data:", handshake);
  logger("Auth data:", auth);
  logger("Headers data:", headers);
  logger("Query data:", query); 

  const origin = headers.origin || "";
  const host = headers.host || "";
  const referer = headers.referer || "";

  const token =
    auth.token ||
    (headers.authorization
      ? headers.authorization.replace(/^Bearer\s+/i, "")
      : "") ||
    query.token;

  const devIndicators = ["localhost", "edutz.galahub.tz"];
  const isDev =
    query.mode === "development" ||
    devIndicators.some(
      (devStr) => origin.includes(devStr) || referer.includes(devStr)
    );

  return { token, origin, host, referer, isDev };
}
