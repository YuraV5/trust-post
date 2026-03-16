import { Socket } from 'socket.io';

export function extractSocketToken(client: Socket): string | null {
  const auth = client.handshake.auth as Record<string, unknown> | undefined;
  const authToken = auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const headerAuth = client.handshake.headers.authorization;
  if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
    return headerAuth.slice(7).trim();
  }

  const queryToken = client.handshake.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
}
