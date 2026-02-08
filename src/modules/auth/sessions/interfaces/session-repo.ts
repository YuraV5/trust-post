import { Session } from '@prisma/client';
import { UserSession } from '../types';

export interface ISessionRepo {
  findByUserId(userId: string): Promise<Session[]>;
  findByUserIdAndDeviceId(userId: string, deviceId: string): Promise<Session | null>;
  create(data: UserSession): Promise<Session>;
  update(sessionId: string, data: Partial<Session>): Promise<Session>;
  deleteByUserAndDevice(userId: string, deviceId: string): Promise<number>;
  deleteByUserId(userId: string): Promise<number>;
  deleteByUserIdExcept(userId: string, exceptDeviceId: string): Promise<number>;
  deleteManyByIds(ids: string[]): Promise<number>;
}
