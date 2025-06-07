export const authContext = (s) => ({ token: s.token, isDev: s.isDev });

export function extractAuthMetadata(socket) {
  const { handshake } = socket;
  const { auth, headers = {}, query = {} } = handshake;

  const origin = headers.origin || '';
  const host = headers.host || '';

  const token =
    auth?.token ||
    headers.authorization?.replace("Bearer ", "") ||
    query.token;

  const isDev =
    query.mode === "development" ||
    host.includes("localhost") ||
    host.includes("edutz.galahub.org");

  return { token, origin, host, isDev };
}
