import { Session } from '@prisma/client';
import { SessionMapping } from '../types';
import { maskIp } from '../../../../common/utils';

export const mapSession = (session: Session): SessionMapping => {
  return {
    id: session.id,
    deviceId: session.deviceId,
    ip: maskIp(session.ip),
    userAgent: session.userAgent ?? 'Unknown User Agent',
    lastUsedAt: session.lastUsedAt,
    createdAt: session.createdAt,
  };
};

export const mapSessions = (sessions: Session[]): SessionMapping[] => {
  return sessions.map(mapSession);
};
