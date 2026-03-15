import { Session } from '@prisma/client';
import { UserSession } from '../types';

export interface ISessionRepo {
  findByUserId(userId: string): Promise<Session[]>;
  findByUserIdAndDeviceId(userId: string, deviceId: string): Promise<Session | null>;
  findById(sessionId: string): Promise<Session | null>;
  findActiveById(sessionId: string): Promise<Session | null>;
  upsert(data: UserSession): Promise<Session>;
  update(sessionId: string, data: Partial<Session>): Promise<Session>;
  deleteByUserId(userId: string): Promise<number>;
  deleteSessionsExceptCurrent(userId: string, exceptDeviceId: string): Promise<number>;
  deleteByIds(ids: string[]): Promise<number>;
}
