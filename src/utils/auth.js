export const authContext = (s) => ({ token: s.token, isDev: s.isDev });


export function extractAuthMetadata(socket) {
  const { handshake } = socket;
  const { auth = {}, headers = {}, query = {} } = handshake;

  const origin = headers.origin || "";
  const host = headers.host || "";
  const referer = headers.referer || "";

  const token =
    auth.token ||
    (headers.authorization
      ? headers.authorization.replace(/^Bearer\s+/i, "")
      : "") ||
    query.token;

  const devIndicators = ["localhost", "edutz.galahub.org"];
  const isDev =
    query.mode === "development" ||
    devIndicators.some(
      (devStr) => origin.includes(devStr) || referer.includes(devStr)
    );

  return { token, origin, host, referer, isDev };
}
