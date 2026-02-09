import { Injectable } from '@nestjs/common';
import { ISessionRepo } from '../interfaces';
import { Session } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserSession } from '../types';

@Injectable()
export class SessionsRepo implements ISessionRepo {
  constructor(private readonly db: PrismaService) {}

  async findByUserId(userId: string): Promise<Session[]> {
    return this.db.session.findMany({ where: { userId } });
  }

  async findByUserIdAndDeviceId(userId: string, deviceId: string): Promise<Session | null> {
    return await this.db.session.findFirst({ where: { userId, deviceId } });
  }

  async upsert(data: UserSession): Promise<Session> {
    const { sessionId, ...rest } = data;
    return this.db.session.upsert({
      where: {
        userId_deviceId: {
          userId: rest.userId,
          deviceId: rest.deviceId,
        },
      },
      update: {
        refreshTokenHash: rest.refreshTokenHash,
        ip: rest.ip,
        userAgent: rest.userAgent,
        lastUsedAt: new Date(),
        expiresAt: rest.expiresAt,
      },
      create: { ...rest, id: sessionId, lastUsedAt: new Date() },
    });
  }

  async update(sessionId: string, data: Partial<Session>): Promise<Session> {
    return await this.db.session.update({ where: { id: sessionId }, data });
  }

  async deleteByUserAndDevice(userId: string, deviceId: string): Promise<number> {
    const res = await this.db.session.deleteMany({
      where: { userId, deviceId },
    });

    return res.count;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.db.session.deleteMany({ where: { userId } });
    return result.count;
  }

  async deleteSessionsExceptCurrent(userId: string, sessionId: string): Promise<number> {
    const result = await this.db.session.deleteMany({ where: { userId, NOT: { id: sessionId } } });
    return result.count;
  }

  async deleteByIds(ids: string[]): Promise<number> {
    const result = await this.db.session.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  async findById(sessionId: string): Promise<Session | null> {
    return this.db.session.findUnique({ where: { id: sessionId } });
  }
}
