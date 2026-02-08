import { MessageResponse } from '../../../../common/types';
import { SessionMapping } from '../types';

export interface ISessionService {
  getMySessions(userId: string): Promise<SessionMapping[]>;
  deleteAllSessions(userId: string): Promise<MessageResponse>;
  deleteAllExceptCurrentSession(userId: string, currentDeviceId: string): Promise<MessageResponse>;
  setLastUsedTimestamp(sessionId: string): Promise<void>;
}
