import { ResponseMessage } from '../../../../common/types';
import { SessionMapping, UserSession } from '../types';

export interface ISessionService {
  getMySessions(userId: string): Promise<SessionMapping[]>;
  deleteAllSessions(userId: string): Promise<ResponseMessage>;
  deleteBySessionId(sessionId: string, userId: string): Promise<ResponseMessage>;
  deleteAllExceptCurrentSession(userId: string, currentDeviceId: string): Promise<ResponseMessage>;
  setLastUsedTimestamp(sessionId: string): Promise<void>;
  createOrUpdate(data: UserSession): Promise<void>;
  validateSession(sessionId: string, token: string): Promise<boolean>;
  getSessionByUserIdAndDeviceId(userId: string, deviceId: string): Promise<{ sessionId: string } | null>;
}
